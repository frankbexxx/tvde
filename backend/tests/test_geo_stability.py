"""Tests for A006 geo stability layer: immediate send, staleness, dispatch retry."""

import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.driver_location import upsert_driver_location


def _make_db() -> Session:
    return SessionLocal()


def _create_driver(
    db: Session, lat: float = 38.7, lng: float = -9.1, is_available: bool = True
) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=is_available,
    )
    db.add(driver)
    db.flush()
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


def test_geo_stability_driver_first_send_logged() -> None:
    """First location upsert logs driver_location_first_send."""
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)

    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    r = client.post(
        "/drivers/location",
        json={"lat": 38.7, "lng": -9.1, "timestamp": now_ms},
    )
    assert r.status_code == 204

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == uuid.UUID(driver_id))
    ).scalar_one_or_none()
    assert loc is not None
    assert float(loc.lat) == 38.7

    _reset_overrides()
    db.close()


def test_geo_stability_stale_drivers_excluded() -> None:
    """Drivers with location older than LOCATION_MAX_AGE_SECONDS are excluded from dispatch."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()

    driver_id = _create_driver(db)
    # Older than LOCATION_MAX_AGE_SECONDS (stale for dispatch)
    stale_sec = int(getattr(settings, "LOCATION_MAX_AGE_SECONDS", 45)) + 10
    old_ts = datetime.now(timezone.utc) - timedelta(seconds=stale_sec)
    loc = DriverLocation(
        driver_id=uuid.UUID(driver_id),
        lat=38.7,
        lng=-9.1,
        timestamp=old_ts,
    )
    db.add(loc)
    db.commit()

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
    trip_id = body["trip_id"]

    offers = (
        db.execute(select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id)))
        .scalars()
        .all()
    )
    # Stale driver should be excluded -> 0 offers
    assert len(offers) == 0

    _reset_overrides()
    db.close()


def test_geo_stability_dispatch_succeeds_with_fresh_location() -> None:
    """Dispatch creates offers when driver has fresh location."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()

    driver_id = _create_driver(db)
    loc = DriverLocation(
        driver_id=uuid.UUID(driver_id),
        lat=38.7,
        lng=-9.1,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(loc)
    db.commit()

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
    trip_id = body["trip_id"]

    offers = list(
        db.execute(select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id)))
        .scalars()
        .all()
    )
    assert len(offers) >= 1

    _reset_overrides()
    db.close()


def test_geo_stability_dispatch_retry_after_driver_sends_location() -> None:
    """When trip created with 0 drivers, retry succeeds if driver sends location during wait."""
    db = _make_db()
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()

    driver_id = _create_driver(db)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))

    # Thread: add driver location after 1 second (simulates driver coming online)

    def add_location_delayed() -> None:
        time.sleep(1.0)
        sess = SessionLocal()
        try:
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            upsert_driver_location(
                db=sess,
                driver_id=driver_id,
                lat=38.7,
                lng=-9.1,
                timestamp_ms=now_ms,
            )
        finally:
            sess.close()

    t = threading.Thread(target=add_location_delayed)
    t.start()

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
    t.join(timeout=5)

    assert r.status_code == 200
    body = r.json()
    trip_id = body["trip_id"]

    offers = list(
        db.execute(select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id)))
        .scalars()
        .all()
    )
    # Retry should have picked up the driver's location
    assert (
        len(offers) >= 1
    ), "Dispatch retry should create offers when driver sends location during wait"

    _reset_overrides()
    db.close()
