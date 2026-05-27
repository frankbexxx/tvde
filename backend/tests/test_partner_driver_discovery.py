"""Partner driver discovery & add-to-fleet (C018)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_discover_finds_default_pool_driver() -> None:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        db.add(Partner(id=partner_id, name="Discover Fleet"))
        u_d = User(
            role=Role.driver,
            name="Default Pool Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Discover Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=partner_id,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
        driver_id = str(u_d.id)
        driver_query = u_d.phone.replace("+351", "")
    finally:
        db.close()

    c = TestClient(app)
    r = c.get(
        "/partner/drivers/discover",
        params={"q": driver_query},
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 200, r.text
    ids = [row["user_id"] for row in r.json()]
    assert driver_id in ids


def test_add_to_fleet_from_default_pool() -> None:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        db.add(Partner(id=partner_id, name="Add Fleet"))
        u_d = User(
            role=Role.driver,
            name="Add Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Add Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=partner_id,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r = c.post(
        f"/partner/drivers/{driver_id}/add-to-fleet",
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 200
    assert r.json()["partner_id"] == str(partner_id)


def test_add_to_fleet_rejects_non_default_pool() -> None:
    db = SessionLocal()
    try:
        partner_a = uuid.uuid4()
        partner_b = uuid.uuid4()
        db.add_all([Partner(id=partner_a, name="Fleet A"), Partner(id=partner_b, name="Fleet B")])
        u_d = User(
            role=Role.driver,
            name="Other Fleet Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Fleet A Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=partner_a,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=partner_b,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r = c.post(
        f"/partner/drivers/{driver_id}/add-to-fleet",
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "driver_not_in_default_pool"
