"""Tests for offer timeout (A003)."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.base import Base
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.offer_dispatch import create_offers_for_trip, expire_stale_offers, redispatch_expired_trips


Base.metadata.create_all(bind=engine)


def _make_db() -> Session:
    return SessionLocal()


def _create_driver_with_location(db: Session, lat: float, lng: float) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(user_id=user.id, status=DriverStatus.approved, commission_percent=15.0)
    db.add(driver)
    db.flush()
    loc = DriverLocation(driver_id=user.id, lat=lat, lng=lng, timestamp=datetime.now(timezone.utc))
    db.add(loc)
    db.commit()
    return str(user.id)


def _create_passenger_and_trip(db: Session) -> tuple[str, str]:
    user = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    trip = Trip(
        passenger_id=user.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.flush()
    db.commit()
    return str(user.id), str(trip.id)


def _override_deps(db: Session, user_ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


def test_ot_001_offer_expires_after_timeout() -> None:
    """TEST-OT-001: offer expires after timeout."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    _create_driver_with_location(db, 38.7, -9.1)
    _, trip_id = _create_passenger_and_trip(db)
    trip = db.execute(select(Trip).where(Trip.id == uuid.UUID(trip_id))).scalar_one()
    create_offers_for_trip(db=db, trip=trip)
    db.commit()

    offers = list(db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all())
    assert len(offers) >= 1
    offer = offers[0]
    assert offer.status == OfferStatus.pending

    # Simulate timeout: set expires_at in the past
    offer.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()

    # Run expire job
    expired = expire_stale_offers(db)
    assert expired >= 1

    db.refresh(offer)
    assert offer.status == OfferStatus.expired

    db.close()


def test_ot_002_redispatch_triggered() -> None:
    """TEST-OT-002: redispatch triggered when all offers expired."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    # Create 6 drivers: top 5 get initial offers, 6th available for redispatch
    for i in range(6):
        _create_driver_with_location(db, 38.7 + i * 0.01, -9.1 + i * 0.01)
    _, trip_id = _create_passenger_and_trip(db)
    trip = db.execute(select(Trip).where(Trip.id == uuid.UUID(trip_id))).scalar_one()
    create_offers_for_trip(db=db, trip=trip)
    db.commit()

    offers = list(db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all())
    assert len(offers) >= 1
    for o in offers:
        o.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()

    # expire_stale_offers marks them expired, redispatch creates new offers
    new_offers = redispatch_expired_trips(db)
    assert len(new_offers) >= 1

    db.expire_all()  # Clear session cache to see committed data
    all_offers = list(db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all())
    pending = [o for o in all_offers if o.status == OfferStatus.pending]
    assert len(pending) >= 1, f"Expected pending offers, got statuses: {[o.status for o in all_offers]}"

    db.close()
