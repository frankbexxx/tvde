"""C013, C014, I011 — partner PATCH drivers + trip reassign."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_partner_patch_driver_status_and_availability() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Fleet Patch"))
        u_d = User(
            role=Role.driver,
            name="Patch Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Patch Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=True,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    h = {"Authorization": f"Bearer {tok}"}

    r = c.patch(
        f"/partner/drivers/{driver_id}/status",
        json={"enabled": False},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"

    r2 = c.patch(
        f"/partner/drivers/{driver_id}/availability",
        json={"online": True},
        headers=h,
    )
    assert r2.status_code == 400
    assert r2.json().get("detail") == "driver_not_approved"

    r3 = c.patch(
        f"/partner/drivers/{driver_id}/status",
        json={"enabled": True},
        headers=h,
    )
    assert r3.status_code == 200
    assert r3.json()["status"] == "approved"

    r4 = c.patch(
        f"/partner/drivers/{driver_id}/availability",
        json={"online": False},
        headers=h,
    )
    assert r4.status_code == 200
    assert r4.json()["is_available"] is False


def test_partner_reassign_trip_driver() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Fleet Reassign"))
        u_a = User(
            role=Role.driver,
            name="Driver A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_b = User(
            role=Role.driver,
            name="Driver B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_pax = User(
            role=Role.passenger,
            name="Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_mgr = User(
            role=Role.partner,
            name="Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_a, u_b, u_pax, u_mgr])
        db.flush()
        db.add_all(
            [
                Driver(
                    user_id=u_a.id,
                    partner_id=pid,
                    status=DriverStatus.approved,
                    commission_percent=10.0,
                ),
                Driver(
                    user_id=u_b.id,
                    partner_id=pid,
                    status=DriverStatus.approved,
                    commission_percent=10.0,
                ),
            ]
        )
        db.flush()
        tr = Trip(
            passenger_id=u_pax.id,
            driver_id=u_a.id,
            status=TripStatus.assigned,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
        )
        db.add(tr)
        db.commit()
        trip_id = str(tr.id)
        tok = create_access_token(subject=str(u_mgr.id), role=u_mgr.role.value)["token"]
        id_b = str(u_b.id)
    finally:
        db.close()

    c = TestClient(app)
    h = {"Authorization": f"Bearer {tok}"}
    r = c.post(
        f"/partner/trips/{trip_id}/reassign-driver",
        json={"driver_user_id": id_b},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["driver_id"] == id_b
