"""SP-F: governança — super_admin + motivo em eliminação / bloqueio em massa."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Role, UserStatus

SUPER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


@pytest.fixture
def super_admin_ctx() -> None:
    async def _super() -> UserContext:
        return UserContext(user_id=SUPER_ID, role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _super
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_only_ctx() -> None:
    async def _adm() -> UserContext:
        return UserContext(user_id=ADMIN_ID, role=Role.admin)

    app.dependency_overrides[get_current_user] = _adm
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.usefixtures("admin_only_ctx")
def test_delete_user_forbidden_for_plain_admin(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    uid = uuid.uuid4()
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="DelTarget",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.request(
        "DELETE",
        f"/admin/users/{uid}",
        json={"governance_reason": "teste motivo dez"},
    )
    assert r.status_code == 403
    assert r.json().get("detail") == "super_admin_required"


@pytest.mark.usefixtures("super_admin_ctx")
def test_delete_user_requires_governance_reason(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    uid = uuid.uuid4()
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="DelTarget2",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.request(
        "DELETE", f"/admin/users/{uid}", json={"governance_reason": "short"}
    )
    assert r.status_code == 422


@pytest.mark.usefixtures("super_admin_ctx")
def test_super_admin_can_delete_user_without_trips(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    uid = uuid.uuid4()
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="DelOk",
            phone=phone,
            status=UserStatus.active,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.request(
        "DELETE",
        f"/admin/users/{uid}",
        json={"governance_reason": "conta de teste removida após validação SP-F"},
    )
    assert r.status_code == 200, r.text
    db2 = SessionLocal()
    try:
        gone = db2.get(User, uid)
        assert gone is None
    finally:
        db2.close()


@pytest.mark.usefixtures("admin_only_ctx")
def test_bulk_block_forbidden_for_plain_admin(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    r = client.post(
        "/admin/users/bulk-block",
        json={
            "user_ids": [str(uuid.uuid4())],
            "confirmation": "BLOQUEAR_1",
            "governance_reason": "motivo com pelo menos dez chars",
        },
    )
    assert r.status_code == 403
    assert r.json().get("detail") == "super_admin_required"
