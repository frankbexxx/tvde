"""Admin onboarding: POST /admin/partners/{id}/create-admin."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.deps import UserContext, get_current_user
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import Role, UserStatus

_GOVERNANCE_REASON = "motivo teste onboarding gestor frota SP-F."


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture
def admin_override() -> None:
    aid = str(uuid.uuid4())

    async def _super() -> UserContext:
        return UserContext(user_id=aid, role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _super
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_create_partner_org_admin_success(admin_override: None) -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Onboard Co"))
        db.commit()
    finally:
        db.close()

    phone = f"+3519{uuid.uuid4().int % 10_000_000:07d}"
    client = TestClient(app)
    r = client.post(
        f"/admin/partners/{pid}/create-admin",
        json={
            "name": "Fleet Boss",
            "phone": phone,
            "email": None,
            "governance_reason": _GOVERNANCE_REASON,
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "partner"
    assert data["partner_id"] == str(pid)
    assert data["phone"] == phone

    db = SessionLocal()
    try:
        u = db.execute(
            text("SELECT role, partner_org_id FROM users WHERE phone = :p LIMIT 1"),
            {"p": phone},
        ).first()
        assert u is not None
        assert str(u[1]) == str(pid)
    finally:
        db.close()


def test_create_partner_org_admin_duplicate_phone(admin_override: None) -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Dup Co"))
        phone = f"+3519{uuid.uuid4().int % 10_000_000:07d}"
        db.add(
            User(
                role=Role.passenger,
                name="Existing",
                phone=phone,
                status=UserStatus.active,
            )
        )
        db.commit()
    finally:
        db.close()

    r = TestClient(app).post(
        f"/admin/partners/{pid}/create-admin",
        json={"name": "Boss", "phone": phone, "governance_reason": _GOVERNANCE_REASON},
    )
    assert r.status_code == 409
