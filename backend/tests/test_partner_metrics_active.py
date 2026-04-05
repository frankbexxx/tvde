"""active_drivers: fresh GPS or no row + is_available; stale GPS does not fall back."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.partners_admin import partner_metrics


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_active_drivers_stale_location_not_counted_with_available() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Metrics Act"))
        u = User(
            role=Role.driver,
            name="Stale loc",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.flush()
        old = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.add(
            DriverLocation(
                driver_id=u.id,
                lat=38.0,
                lng=-9.0,
                timestamp=old,
            )
        )
        db.commit()
        m = partner_metrics(db, pid)
        assert m["active_drivers"] == 0
    finally:
        db.close()


def test_active_drivers_no_location_uses_is_available() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Metrics Avail"))
        u = User(
            role=Role.driver,
            name="No loc",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.commit()
        m = partner_metrics(db, pid)
        assert m["active_drivers"] == 1
    finally:
        db.close()


def test_partner_token_can_hit_metrics_after_onboarding() -> None:
    """Smoke: real JWT + partner org admin can read metrics."""
    from app.main import app

    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Tok Co"))
        mgr = User(
            role=Role.partner,
            name="M",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add(mgr)
        db.commit()
        tok = create_access_token(subject=str(mgr.id), role=mgr.role.value)["token"]
    finally:
        db.close()

    r = TestClient(app).get(
        "/partner/metrics",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200
    assert "active_drivers" in r.json()
