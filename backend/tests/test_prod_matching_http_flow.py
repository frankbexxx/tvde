"""HTTP integration tests for production-like trip matching (no ORM location/offer shortcuts)."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from app.auth.passwords import hash_password
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus

TEST_PWD = "demo1234"
TRIP_ORIGIN_LAT = 38.7
TRIP_ORIGIN_LNG = -9.1
TRIP_DEST_LAT = 38.8
TRIP_DEST_LNG = -9.2

# create_trip: up to 5 retries × 2s sleep after the initial dispatch attempt.
DISPATCH_RETRY_COUNT = 5
DISPATCH_RETRY_WAIT_SEC = 2
DISPATCH_RETRY_WINDOW_SEC = DISPATCH_RETRY_COUNT * DISPATCH_RETRY_WAIT_SEC
POST_RETRY_BUFFER_SEC = 2


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido para testes de matching HTTP: {exc}")


@pytest.fixture(autouse=True)
def _clear_dependency_overrides() -> None:
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _prod_like_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)


def _unique_phone() -> str:
    return f"+351{uuid.uuid4().int % 10**9:09d}"


def _clear_all_driver_locations() -> None:
    """Isolate matching: other tests leave DriverLocation rows that create phantom offers."""
    db = SessionLocal()
    try:
        for loc in db.execute(select(DriverLocation)).scalars().all():
            db.delete(loc)
        db.commit()
    finally:
        db.close()


def _seed_driver_and_passenger() -> tuple[str, str]:
    """Create approved driver (no location) and passenger; return (driver_phone, passenger_phone)."""
    db = SessionLocal()
    try:
        pwd_hash = hash_password(TEST_PWD)
        driver_phone = _unique_phone()
        passenger_phone = _unique_phone()

        driver_user = User(
            role=Role.driver,
            name=f"Driver HTTP {uuid.uuid4().hex[:8]}",
            phone=driver_phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=pwd_hash,
        )
        passenger_user = User(
            role=Role.passenger,
            name=f"Passenger HTTP {uuid.uuid4().hex[:8]}",
            phone=passenger_phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=pwd_hash,
        )
        db.add(driver_user)
        db.add(passenger_user)
        db.flush()

        db.add(
            Driver(
                partner_id=DEFAULT_PARTNER_UUID,
                user_id=driver_user.id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.commit()
        return driver_phone, passenger_phone
    finally:
        db.close()


def _login(client: TestClient, phone: str) -> str:
    response = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _post_driver_online(client: TestClient, token: str) -> None:
    response = client.post("/driver/status/online", headers=_auth_headers(token))
    assert response.status_code == 200, response.text


def _post_driver_location(client: TestClient, token: str, lat: float, lng: float) -> None:
    timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    response = client.post(
        "/drivers/location",
        headers={**_auth_headers(token), "Content-Type": "application/json"},
        json={"lat": lat, "lng": lng, "timestamp": timestamp_ms},
    )
    assert response.status_code == 204, response.text


def _post_trip(client: TestClient, token: str) -> str:
    response = client.post(
        "/trips",
        headers={**_auth_headers(token), "Content-Type": "application/json"},
        json={
            "origin_lat": TRIP_ORIGIN_LAT,
            "origin_lng": TRIP_ORIGIN_LNG,
            "destination_lat": TRIP_DEST_LAT,
            "destination_lng": TRIP_DEST_LNG,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["trip_id"]


def _count_trip_offers(trip_id: str) -> int:
    db = SessionLocal()
    try:
        offers = (
            db.execute(
                select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id))
            )
            .scalars()
            .all()
        )
        return len(offers)
    finally:
        db.close()


def _available_trip_ids(client: TestClient, driver_token: str) -> list[str]:
    response = client.get(
        "/driver/trips/available",
        headers=_auth_headers(driver_token),
    )
    assert response.status_code == 200, response.text
    return [row["trip_id"] for row in response.json()]


def test_http_fresh_location_before_trip() -> None:
    _clear_all_driver_locations()
    driver_phone, passenger_phone = _seed_driver_and_passenger()

    driver_client = TestClient(app)
    passenger_client = TestClient(app)

    driver_token = _login(driver_client, driver_phone)
    passenger_token = _login(passenger_client, passenger_phone)

    _post_driver_online(driver_client, driver_token)
    _post_driver_location(
        driver_client, driver_token, TRIP_ORIGIN_LAT, TRIP_ORIGIN_LNG
    )

    trip_id = _post_trip(passenger_client, passenger_token)

    offer_count = _count_trip_offers(trip_id)
    assert offer_count >= 1, f"expected trip_offers >= 1, got {offer_count}"

    available_ids = _available_trip_ids(driver_client, driver_token)
    assert trip_id in available_ids, (
        f"trip {trip_id} not in /driver/trips/available: {available_ids}"
    )


def test_http_location_after_trip_past_retry_window() -> None:
    _clear_all_driver_locations()
    driver_phone, passenger_phone = _seed_driver_and_passenger()

    driver_client = TestClient(app)
    passenger_client = TestClient(app)

    driver_token = _login(driver_client, driver_phone)
    passenger_token = _login(passenger_client, passenger_phone)

    _post_driver_online(driver_client, driver_token)

    trip_id = _post_trip(passenger_client, passenger_token)

    # POST /trips blocks until retries finish; buffer ensures we are past the window.
    time.sleep(POST_RETRY_BUFFER_SEC)

    _post_driver_location(
        driver_client, driver_token, TRIP_ORIGIN_LAT, TRIP_ORIGIN_LNG
    )

    offer_count = _count_trip_offers(trip_id)
    assert offer_count >= 1, f"expected trip_offers >= 1, got {offer_count}"

    available_ids = _available_trip_ids(driver_client, driver_token)
    assert trip_id in available_ids, (
        f"trip {trip_id} not in /driver/trips/available: {available_ids}"
    )
