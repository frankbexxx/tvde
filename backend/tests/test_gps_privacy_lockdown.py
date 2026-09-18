"""L-GPS-02: debug trip-matching strips fleet GPS for trip owner."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.api.routers import debug_routes
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _override(db: Session, user_ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset() -> None:
    app.dependency_overrides.clear()


def _seed_trip_with_nearby_driver(db: Session) -> tuple[str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    driver_u = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(driver_u)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_u.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
        )
    )
    db.add(
        DriverLocation(
            driver_id=driver_u.id,
            lat=38.701,
            lng=-9.101,
            timestamp=datetime.now(timezone.utc),
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    return str(passenger.id), str(trip.id)


def test_owner_trip_matching_has_no_fleet_gps(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(debug_routes, "_require_debug_access", lambda: None)
    db = _db()
    passenger_id, trip_id = _seed_trip_with_nearby_driver(db)
    _override(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)
    try:
        r = client.get(f"/debug/trip-matching/{trip_id}")
        if r.status_code == 404:
            pytest.skip("debug router not mounted in this app instance")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("detail_level") == "owner_aggregate"
        assert body["step_1_drivers_with_location"]["count"] >= 1
        assert "list" not in body["step_1_drivers_with_location"]
        assert "list" not in body["step_2_drivers_in_radius"]
        assert "list" not in body["step_3_offers"]
        assert "pending_count" in body["step_3_offers"]
        assert "driver_id" not in body["step_1_drivers_with_location"]
        assert "lat" not in body["step_1_drivers_with_location"]
        assert "lng" not in body["step_1_drivers_with_location"]
    finally:
        _reset()
        db.close()


def test_staff_trip_matching_may_include_detail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(debug_routes, "_require_debug_access", lambda: None)
    db = _db()
    _passenger_id, trip_id = _seed_trip_with_nearby_driver(db)
    staff_id = str(uuid.uuid4())
    _override(db, UserContext(user_id=staff_id, role=Role.super_admin))
    client = TestClient(app)
    try:
        r = client.get(f"/debug/trip-matching/{trip_id}")
        if r.status_code == 404:
            pytest.skip("debug router not mounted in this app instance")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("detail_level") == "staff"
        assert "list" in body["step_1_drivers_with_location"]
        assert len(body["step_1_drivers_with_location"]["list"]) >= 1
        row = body["step_1_drivers_with_location"]["list"][0]
        assert "lat" in row and "lng" in row and "driver_id" in row
    finally:
        _reset()
        db.close()


def test_non_owner_non_staff_forbidden(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(debug_routes, "_require_debug_access", lambda: None)
    db = _db()
    _passenger_id, trip_id = _seed_trip_with_nearby_driver(db)
    _override(db, UserContext(user_id=str(uuid.uuid4()), role=Role.passenger))
    client = TestClient(app)
    try:
        r = client.get(f"/debug/trip-matching/{trip_id}")
        if r.status_code == 404:
            pytest.skip("debug router not mounted in this app instance")
        assert r.status_code == 403
    finally:
        _reset()
        db.close()
