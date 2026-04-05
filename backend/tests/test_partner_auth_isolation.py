"""Partner tokens: /partner/* OK; /admin/* and driver-only routes forbidden."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
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


def _partner_token() -> str:
    db = SessionLocal()
    try:
        u = User(
            role=Role.partner,
            name="Iso Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=DEFAULT_PARTNER_UUID,
        )
        db.add(u)
        db.commit()
        return create_access_token(subject=str(u.id), role=u.role.value)["token"]
    finally:
        db.close()


def test_partner_forbidden_admin_system_health() -> None:
    tok = _partner_token()
    r = TestClient(app).get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403


def test_partner_forbidden_admin_create_partner() -> None:
    tok = _partner_token()
    r = TestClient(app).post(
        "/admin/partners",
        json={"name": "Hack"},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403


def test_partner_forbidden_driver_location() -> None:
    tok = _partner_token()
    r = TestClient(app).post(
        "/drivers/location",
        json={"lat": 38.7, "lng": -9.1, "timestamp": 1},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403


def test_driver_forbidden_partner_drivers() -> None:
    db = SessionLocal()
    try:
        u = User(
            role=Role.driver,
            name="D",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
            )
        )
        db.commit()
        tok = create_access_token(subject=str(u.id), role=u.role.value)["token"]
    finally:
        db.close()
    r = TestClient(app).get(
        "/partner/drivers",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403
