"""POST /driver/trips/{id}/start — proximidade ao pickup (Haversine, settings)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.utils.geo import haversine_m

@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido para test_start_trip_proximity: {exc}")


TRIP_JSON = {
    "origin_lat": 38.7,
    "origin_lng": -9.1,
    "destination_lat": 38.8,
    "destination_lng": -9.2,
}


@pytest.fixture(autouse=True)
def _stripe_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)


def _override_user_and_db(db: Session, ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _create_passenger(db: Session) -> str:
    u = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return str(u.id)


def _create_driver_with_location(db: Session, lat: float, lng: float) -> str:
    u = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(d)
    db.flush()
    db.add(
        DriverLocation(
            driver_id=u.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(u)
    return str(u.id)


def _http_create_trip(client: TestClient, db: Session, passenger_id: str) -> str:
    _override_user_and_db(db, UserContext(user_id=passenger_id, role=Role.passenger))
    r = client.post("/trips", json=TRIP_JSON)
    assert r.status_code == 200, r.text
    return r.json()["trip_id"]


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides() -> None:
    yield
    app.dependency_overrides.clear()


def test_start_trip_succeeds_when_driver_near_pickup(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        assert client.post(f"/driver/trips/{trip_id}/accept").status_code == 200
        assert client.post(f"/driver/trips/{trip_id}/arriving").status_code == 200
        r = client.post(f"/driver/trips/{trip_id}/start")
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "ongoing"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_start_trip_400_when_driver_too_far_from_pickup(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        assert client.post(f"/driver/trips/{trip_id}/accept").status_code == 200
        assert client.post(f"/driver/trips/{trip_id}/arriving").status_code == 200

        db.execute(
            update(DriverLocation)
            .where(DriverLocation.driver_id == uuid.UUID(driver_id))
            .values(lat=40.0, lng=0.0)
        )
        db.commit()

        r = client.post(f"/driver/trips/{trip_id}/start")
        assert r.status_code == 400, r.text
        assert r.json()["detail"] == "driver_too_far_from_pickup"
        t = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        assert t.status == TripStatus.arriving
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_start_trip_400_when_driver_location_missing(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        assert client.post(f"/driver/trips/{trip_id}/accept").status_code == 200
        assert client.post(f"/driver/trips/{trip_id}/arriving").status_code == 200

        db.execute(
            delete(DriverLocation).where(DriverLocation.driver_id == uuid.UUID(driver_id))
        )
        db.commit()

        r = client.post(f"/driver/trips/{trip_id}/start")
        assert r.status_code == 400, r.text
        assert r.json()["detail"] == "driver_location_required"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_haversine_m_near_pickup_within_backend_radius() -> None:
    """Sanity: same coords as TRIP_JSON vs small offset stays within 70 m."""
    d = haversine_m(38.7, -9.1, 38.7004, -9.1)
    assert d <= float(settings.DRIVER_START_TRIP_MAX_DISTANCE_M)
