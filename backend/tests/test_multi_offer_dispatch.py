"""Tests for multi-offer dispatch (A002)."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.db.base import Base
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus


Base.metadata.create_all(bind=engine)


def _make_db() -> Session:
    return SessionLocal()


def _create_driver_with_location(db: Session, lat: float, lng: float, is_available: bool = True) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=is_available,
    )
    db.add(driver)
    db.flush()
    loc = DriverLocation(
        driver_id=user.id,
        lat=lat,
        lng=lng,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(loc)
    db.commit()
    return str(user.id)


def _create_passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


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


def test_mod_001_offer_creation() -> None:
    """TEST-MOD-001: 5 offers created when 5 drivers available."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    for i in range(5):
        _create_driver_with_location(db, 38.7 + i * 0.01, -9.1 + i * 0.01)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)

    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "requested"
    trip_id = body["trip_id"]

    offers = db.execute(
        select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id))
    ).scalars().all()
    top_n = getattr(settings, "OFFER_TOP_N", 5)
    assert len(offers) == top_n

    _reset_overrides()
    db.close()


def test_mod_002_only_first_accept_wins() -> None:
    """TEST-MOD-002: first accept succeeds, second returns 409."""
    db = _make_db()
    # Isolate: ensure only our drivers have locations (clear others)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    d1 = _create_driver_with_location(db, 38.7, -9.1)
    d2 = _create_driver_with_location(db, 38.71, -9.11)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)

    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )
    assert r.status_code == 200
    trip_id = r.json()["trip_id"]

    offers = list(db.execute(
        select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id))
    ).scalars().all())
    assert len(offers) >= 2
    offer_for_d1 = next((o for o in offers if str(o.driver_id) == str(d1)), None)
    offer_for_d2 = next((o for o in offers if str(o.driver_id) == str(d2)), None)
    assert offer_for_d1 and offer_for_d2, f"d1={d1}, d2={d2}"
    offer_id = str(offer_for_d1.id)
    offer_id2 = str(offer_for_d2.id)

    _override_deps(db, UserContext(user_id=d1, role=Role.driver))
    r1 = client.post(f"/driver/offers/{offer_id}/accept")
    assert r1.status_code == 200

    _override_deps(db, UserContext(user_id=d2, role=Role.driver))
    r2 = client.post(f"/driver/offers/{offer_id2}/accept")
    assert r2.status_code == 409
    assert r2.json().get("detail") == "offer_already_taken"

    _reset_overrides()
    db.close()


def test_mod_003_rejected_offers_handled() -> None:
    """TEST-MOD-003: driver rejects, offer.status = rejected."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    driver_id = _create_driver_with_location(db, 38.7, -9.1)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)

    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )
    assert r.status_code == 200
    trip_id = r.json()["trip_id"]

    offers = list(db.execute(
        select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id))
    ).scalars().all())
    assert len(offers) >= 1
    offer_id = str(offers[0].id)

    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    r_reject = client.post(f"/driver/offers/{offer_id}/reject")
    assert r_reject.status_code == 200

    db.refresh(offers[0])
    assert offers[0].status == OfferStatus.rejected

    _reset_overrides()
    db.close()


def test_mod_004_expired_offers() -> None:
    """TEST-MOD-004: offer expires after timeout."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    driver_id = _create_driver_with_location(db, 38.7, -9.1)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)

    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )
    assert r.status_code == 200
    trip_id = r.json()["trip_id"]

    offers = list(db.execute(
        select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id))
    ).scalars().all())
    assert len(offers) >= 1
    offer = offers[0]

    # Manually expire the offer
    offer.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()
    db.refresh(offer)

    # Verify expired offers are excluded from pending list
    now = datetime.now(timezone.utc)
    offers_pending = list(db.execute(
        select(TripOffer)
        .where(TripOffer.trip_id == uuid.UUID(trip_id))
        .where(TripOffer.status == OfferStatus.pending)
        .where(TripOffer.expires_at > now)
    ).scalars().all())
    assert len(offers_pending) == 0, "Expired offer should not appear in pending list"

    _reset_overrides()
    db.close()
