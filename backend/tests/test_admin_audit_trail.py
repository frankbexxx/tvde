"""SP-B: trilho de auditoria admin (`admin.*` em `audit_events`)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Role, UserStatus

ADMIN_ACTOR_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


@pytest.fixture
def admin_audit_actor() -> None:
    async def _admin() -> UserContext:
        return UserContext(user_id=ADMIN_ACTOR_ID, role=Role.admin)

    app.dependency_overrides[get_current_user] = _admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.usefixtures("admin_audit_actor")
def test_admin_block_writes_audit_row(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    uid = uuid.uuid4()
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="AuditVictim",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.post(f"/admin/users/{uid}/block")
    assert r.status_code == 200, r.text

    db2 = SessionLocal()
    try:
        rows = (
            db2.execute(
                select(AuditEvent).where(
                    AuditEvent.event_type == "admin.user_block",
                    AuditEvent.entity_id == str(uid),
                )
            )
            .scalars()
            .all()
        )
        assert len(rows) >= 1
        last = rows[-1]
        assert last.payload.get("actor_user_id") == ADMIN_ACTOR_ID
        assert last.payload.get("before_status") == "active"
        assert last.payload.get("after_status") == "blocked"
    finally:
        db2.close()


@pytest.mark.usefixtures("admin_audit_actor")
def test_admin_audit_trail_lists_admin_events(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    uid = uuid.uuid4()
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="AuditList",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    assert client.post(f"/admin/users/{uid}/block").status_code == 200

    r = client.get("/admin/audit-trail?limit=20")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(
        row.get("event_type") == "admin.user_block" and row.get("entity_id") == str(uid)
        for row in data
    )


@pytest.mark.usefixtures("admin_audit_actor")
def test_admin_user_patch_audit_before_after_symmetric(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SP-E: PATCH utilizador regista before/after com os mesmos campos."""
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    uid = uuid.uuid4()
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="PatchMe",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.patch(
        f"/admin/users/{uid}",
        json={"name": "PatchMeRenamed"},
    )
    assert r.status_code == 200, r.text

    db2 = SessionLocal()
    try:
        rows = (
            db2.execute(
                select(AuditEvent).where(
                    AuditEvent.event_type == "admin.user_patch",
                    AuditEvent.entity_id == str(uid),
                )
            )
            .scalars()
            .all()
        )
        assert len(rows) >= 1
        last = rows[-1]
        pl = last.payload
        assert set((pl.get("before") or {}).keys()) == {"name", "phone", "status"}
        assert set((pl.get("after") or {}).keys()) == {"name", "phone", "status"}
        assert pl["after"]["name"] == "PatchMeRenamed"
    finally:
        db2.close()
