"""M2-L4 Emergency / SOS foundation tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.emergency import public_trip_ref
from app.services.partner_vehicles import normalize_plate


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _make_passenger(db: Session) -> User:
    u = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    return u


def _make_driver(db: Session, *, with_vehicle: bool = False) -> tuple[User, Driver]:
    u = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(d)
    db.flush()
    if with_vehicle:
        plate = f"AA-{uuid.uuid4().hex[:2].upper()}-00"
        v = Vehicle(
            partner_id=DEFAULT_PARTNER_UUID,
            plate=plate,
            plate_normalized=normalize_plate(plate),
            make="Test",
            model="Car",
            status="active",
        )
        db.add(v)
        db.flush()
        d.active_vehicle_id = v.id
    db.commit()
    return u, d


def _make_trip(
    db: Session,
    *,
    passenger: User,
    driver: User | None,
    status: TripStatus,
) -> Trip:
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.id if driver else None,
        status=status,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.7369,
        destination_lng=-9.1427,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _auth(user: User, role: Role):
    async def _fake() -> UserContext:
        return UserContext(user_id=str(user.id), role=role)

    app.dependency_overrides[get_current_user] = _fake
    return _fake


def _clear_auth() -> None:
    app.dependency_overrides.pop(get_current_user, None)


def test_public_trip_ref_not_full_uuid() -> None:
    tid = uuid.UUID("12345678-1234-5678-1234-567812345678")
    ref = public_trip_ref(tid)
    assert ref.startswith("VM-")
    assert len(ref) == 11
    assert str(tid) not in ref


def test_passenger_snapshot_own_trip_with_location(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, drv = _make_driver(db, with_vehicle=True)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.ongoing)
        db.add(
            DriverLocation(
                driver_id=drv.user_id,
                lat=38.73,
                lng=-9.14,
                timestamp=datetime.now(timezone.utc),
            )
        )
        db.commit()
        _auth(pax, Role.passenger)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["trip_ref"] == public_trip_ref(trip.id)
        assert data["status"] == "ongoing"
        assert data["vehicle_plate"] is not None
        assert data["driver_display_name"] == drv_user.name
        assert data["location"] is not None
        assert "map_link" in data["location"]
        assert "driver_id" not in data
        assert "passenger_id" not in data
        assert str(trip.id) not in data["trip_ref"]
    finally:
        _clear_auth()
        db.close()


def test_passenger_snapshot_without_location(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db, with_vehicle=True)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.accepted)
        _auth(pax, Role.passenger)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 200, r.text
        assert r.json()["location"] is None
    finally:
        _clear_auth()
        db.close()


def test_driver_snapshot_own_trip_no_passenger_pii(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db, with_vehicle=True)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.arriving)
        _auth(drv_user, Role.driver)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role_view"] == "driver"
        assert data["driver_display_name"] is None
        assert data["vehicle_plate"] is not None
        assert pax.name not in str(data)
        assert pax.phone not in str(data)
    finally:
        _clear_auth()
        db.close()


def test_passenger_forbidden_other_trip(client: TestClient) -> None:
    db = SessionLocal()
    try:
        owner = _make_passenger(db)
        other = _make_passenger(db)
        drv_user, _ = _make_driver(db)
        trip = _make_trip(db, passenger=owner, driver=drv_user, status=TripStatus.ongoing)
        _auth(other, Role.passenger)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 403
        assert r.json()["detail"] == "forbidden_trip_access"
    finally:
        _clear_auth()
        db.close()


def test_driver_forbidden_other_trip(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_a, _ = _make_driver(db)
        drv_b, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_a, status=TripStatus.ongoing)
        _auth(drv_b, Role.driver)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 403
    finally:
        _clear_auth()
        db.close()


def test_completed_trip_not_eligible(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.completed)
        _auth(pax, Role.passenger)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 409
        assert r.json()["detail"] == "trip_not_eligible_for_emergency"
    finally:
        _clear_auth()
        db.close()


def test_driver_assigned_not_eligible(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.assigned)
        _auth(drv_user, Role.driver)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 409
    finally:
        _clear_auth()
        db.close()


def test_passenger_assigned_eligible(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.assigned)
        _auth(pax, Role.passenger)
        r = client.get(f"/emergency/trips/{trip.id}/snapshot")
        assert r.status_code == 200
    finally:
        _clear_auth()
        db.close()


def test_trip_not_found(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        db.commit()
        _auth(pax, Role.passenger)
        r = client.get(f"/emergency/trips/{uuid.uuid4()}/snapshot")
        assert r.status_code == 404
    finally:
        _clear_auth()
        db.close()


def test_emergency_audits_opened_call_shared(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_user, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_user, status=TripStatus.ongoing)
        _auth(pax, Role.passenger)
        for action in ("opened", "call_initiated", "shared"):
            r = client.post(
                f"/emergency/trips/{trip.id}/events",
                json={"action": action},
            )
            assert r.status_code == 200, r.text
            assert r.json()["recorded"] is True
        db.expire_all()
        types = {
            e.event_type
            for e in db.execute(
                select(AuditEvent).where(AuditEvent.entity_id == str(trip.id))
            )
            .scalars()
            .all()
        }
        assert "emergency.opened" in types
        assert "emergency.call_initiated" in types
        assert "emergency.shared" in types
        # Payload must not contain coordinates
        for e in (
            db.execute(select(AuditEvent).where(AuditEvent.entity_id == str(trip.id)))
            .scalars()
            .all()
        ):
            assert "lat" not in e.payload
            assert "lng" not in e.payload
            assert "trip_ref" in e.payload
    finally:
        _clear_auth()
        db.close()


def test_admin_role_forbidden(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = User(
            role=Role.admin,
            name="Admin",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(admin)
        db.commit()
        _auth(admin, Role.admin)
        r = client.get(f"/emergency/trips/{uuid.uuid4()}/snapshot")
        assert r.status_code == 403
    finally:
        _clear_auth()
        db.close()
