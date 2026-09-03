"""E5 / S-ADM-01: Admin POST /drivers/{id}/approve|reject."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver
from app.db.models.user import User
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services import admin_driver_status


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_auth_override() -> None:
    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _make_driver(db: Session, *, status: DriverStatus) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"E5 {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=status,
        documents=None,
        commission_percent=20.0,
        is_available=True,
    )
    db.add(d)
    db.commit()
    return user.id


def _audit_count(db: Session, *, driver_id: uuid.UUID, action: str) -> int:
    return int(
        db.execute(
            select(func.count())
            .select_from(AuditEvent)
            .where(
                AuditEvent.event_type == f"admin.{action}",
                AuditEvent.entity_type == "driver",
                AuditEvent.entity_id == str(driver_id),
            )
        ).scalar_one()
    )


@pytest.mark.usefixtures("admin_auth_override")
def test_approve_pending_to_approved(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.pending)
    r = client.post(f"/admin/drivers/{uid}/approve")
    assert r.status_code == 200, r.text
    assert r.json() == {"driver_id": str(uid), "status": "approved"}
    db.expire_all()
    assert (
        db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one().status
        == DriverStatus.approved
    )
    assert _audit_count(db, driver_id=uid, action="driver_approve") == 1


@pytest.mark.usefixtures("admin_auth_override")
def test_reject_pending_to_rejected(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.pending)
    r = client.post(f"/admin/drivers/{uid}/reject")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rejected"
    db.expire_all()
    row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
    assert row.status == DriverStatus.rejected
    assert row.is_available is False
    assert _audit_count(db, driver_id=uid, action="driver_reject") == 1


@pytest.mark.usefixtures("admin_auth_override")
def test_approve_rejected_and_reject_approved(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.rejected)
    r = client.post(f"/admin/drivers/{uid}/approve")
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    r2 = client.post(f"/admin/drivers/{uid}/reject")
    assert r2.status_code == 200
    assert r2.json()["status"] == "rejected"
    db.expire_all()
    assert (
        db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one().status
        == DriverStatus.rejected
    )


@pytest.mark.usefixtures("admin_auth_override")
def test_approve_idempotent_no_extra_audit(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.approved)
    r1 = client.post(f"/admin/drivers/{uid}/approve")
    r2 = client.post(f"/admin/drivers/{uid}/approve")
    assert r1.status_code == 200 and r2.status_code == 200
    assert _audit_count(db, driver_id=uid, action="driver_approve") == 0


@pytest.mark.usefixtures("admin_auth_override")
def test_reject_idempotent_no_extra_audit(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.rejected)
    r1 = client.post(f"/admin/drivers/{uid}/reject")
    r2 = client.post(f"/admin/drivers/{uid}/reject")
    assert r1.status_code == 200 and r2.status_code == 200
    assert _audit_count(db, driver_id=uid, action="driver_reject") == 0


@pytest.mark.usefixtures("admin_auth_override")
def test_approve_404_unknown_driver(client: TestClient) -> None:
    missing = uuid.uuid4()
    r = client.post(f"/admin/drivers/{missing}/approve")
    assert r.status_code == 404
    assert r.json()["detail"] == "driver_not_found"


def test_approve_403_non_admin(client: TestClient, db: Session) -> None:
    uid = _make_driver(db, status=DriverStatus.pending)

    async def _passenger() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.passenger)

    app.dependency_overrides[get_current_user] = _passenger
    try:
        r = client.post(f"/admin/drivers/{uid}/approve")
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.usefixtures("admin_auth_override")
def test_invalid_transition_409(client: TestClient, db: Session, monkeypatch) -> None:
    """Defesa: se o conjunto permitido for vazio, resposta 409."""
    uid = _make_driver(db, status=DriverStatus.pending)
    monkeypatch.setattr(admin_driver_status, "_APPROVE_FROM", frozenset())
    r = client.post(f"/admin/drivers/{uid}/approve")
    assert r.status_code == 409
    assert r.json()["detail"] == "invalid_driver_status_transition"


def test_approve_requires_auth_401(client: TestClient) -> None:
    r = client.post(f"/admin/drivers/{uuid.uuid4()}/approve")
    assert r.status_code == 401
