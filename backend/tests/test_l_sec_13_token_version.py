"""L-SEC-13: token_version invalidates JWTs after password change."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routers import admin_ws as admin_ws_mod
from app.api.routers import ws as ws_mod
from app.auth.passwords import hash_password
from app.auth.security import (
    TOKEN_VERSION_CLAIM,
    create_access_token,
    decode_access_token,
    token_version_from_claims,
)
from app.core.config import settings
from app.db.models.user import User
from app.db.session import engine
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


class _QP:
    def __init__(self, data: dict[str, str]) -> None:
        self._data = data

    def get(self, key: str, default: str | None = None) -> str | None:
        return self._data.get(key, default)


class _FakeWS:
    def __init__(self, token: str) -> None:
        self.headers: dict[str, str] = {}
        self.query_params = _QP({"token": token})


def _seed_user(
    db: Session,
    *,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
    password: str = "OldPass123",
    token_version: int = 0,
) -> User:
    u = User(
        role=role,
        name=f"LSec13 {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=status,
        password_hash=hash_password(password),
        token_version=token_version,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_h_default_token_version_is_zero(db: Session) -> None:
    u = User(
        role=Role.passenger,
        name="TV0",
        phone=unique_test_phone(),
        status=UserStatus.active,
        password_hash=hash_password("Abcdef12"),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    assert u.token_version == 0


def test_a_old_jwt_revoked_after_password_change(client: TestClient, db: Session) -> None:
    u = _seed_user(db)
    login = client.post(
        "/auth/login", json={"phone": u.phone, "password": "OldPass123"}
    )
    assert login.status_code == 200, login.text
    old_tok = login.json()["access_token"]
    assert (
        client.get("/auth/me", headers={"Authorization": f"Bearer {old_tok}"}).status_code
        == 200
    )

    chg = client.post(
        "/auth/me/password",
        headers={"Authorization": f"Bearer {old_tok}"},
        json={"current_password": "OldPass123", "new_password": "NewPass456"},
    )
    assert chg.status_code == 200, chg.text

    rejected = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {old_tok}"}
    )
    assert rejected.status_code == 401
    assert rejected.json()["detail"] == "invalid_token"

    db.refresh(u)
    assert u.token_version == 1


def test_b_new_login_emits_matching_token_version(
    client: TestClient, db: Session
) -> None:
    u = _seed_user(db, password="StartPass1")
    old = client.post(
        "/auth/login", json={"phone": u.phone, "password": "StartPass1"}
    ).json()["access_token"]
    assert (
        client.post(
            "/auth/me/password",
            headers={"Authorization": f"Bearer {old}"},
            json={"current_password": "StartPass1", "new_password": "FreshPass2"},
        ).status_code
        == 200
    )

    fresh = client.post(
        "/auth/login", json={"phone": u.phone, "password": "FreshPass2"}
    )
    assert fresh.status_code == 200, fresh.text
    new_tok = fresh.json()["access_token"]
    payload = decode_access_token(new_tok)
    db.refresh(u)
    assert payload[TOKEN_VERSION_CLAIM] == u.token_version == 1
    assert (
        client.get("/auth/me", headers={"Authorization": f"Bearer {new_tok}"}).status_code
        == 200
    )


def test_c_old_password_rejected(client: TestClient, db: Session) -> None:
    u = _seed_user(db, password="KeepOld99")
    tok = client.post(
        "/auth/login", json={"phone": u.phone, "password": "KeepOld99"}
    ).json()["access_token"]
    assert (
        client.post(
            "/auth/me/password",
            headers={"Authorization": f"Bearer {tok}"},
            json={"current_password": "KeepOld99", "new_password": "BrandNew88"},
        ).status_code
        == 200
    )
    bad = client.post(
        "/auth/login", json={"phone": u.phone, "password": "KeepOld99"}
    )
    assert bad.status_code == 401


def test_d_blocked_user_still_403(client: TestClient, db: Session) -> None:
    u = _seed_user(db)
    tok = create_access_token(
        subject=str(u.id),
        role=u.role.value,
        token_version=int(u.token_version),
    )["token"]
    u.status = UserStatus.blocked
    db.commit()
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
    assert r.json()["detail"] == "blocked"


def test_e_authorization_follows_db_role_not_jwt_claim(
    client: TestClient, db: Session
) -> None:
    u = _seed_user(db, role=Role.admin)
    tok = create_access_token(
        subject=str(u.id),
        role=Role.admin.value,  # stale claim after demotion
        token_version=int(u.token_version),
    )["token"]
    u.role = Role.passenger
    db.commit()
    r = client.get("/admin/partners", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
    assert r.json()["detail"] == "forbidden"


def test_e_stale_admin_claim_cannot_use_admin_api(
    client: TestClient, db: Session
) -> None:
    """Passenger in DB with JWT role=admin must not pass get_current_admin."""
    u = _seed_user(db, role=Role.passenger)
    tok = create_access_token(
        subject=str(u.id),
        role=Role.admin.value,
        token_version=int(u.token_version),
    )["token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    r = client.get("/admin/partners", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
    assert r.json()["detail"] == "forbidden"


def test_f_google_path_emits_token_version(db: Session) -> None:
    """Google exchange uses same create_access_token helper with user.token_version."""
    u = _seed_user(db, token_version=3)
    tok = create_access_token(
        subject=str(u.id),
        role=u.role.value,
        token_version=int(u.token_version),
    )["token"]
    payload = decode_access_token(tok)
    assert payload[TOKEN_VERSION_CLAIM] == 3


def test_g_ws_rejects_token_version_mismatch(db: Session) -> None:
    u = _seed_user(db, role=Role.driver, token_version=2)
    stale = create_access_token(
        subject=str(u.id),
        role=Role.driver.value,
        token_version=0,
    )["token"]
    ok = create_access_token(
        subject=str(u.id),
        role=Role.driver.value,
        token_version=2,
    )["token"]

    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(stale))) is None
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(ok))) == str(u.id)

    admin = _seed_user(db, role=Role.admin, token_version=1)
    stale_a = create_access_token(
        subject=str(admin.id),
        role=Role.admin.value,
        token_version=0,
    )["token"]
    ok_a = create_access_token(
        subject=str(admin.id),
        role=Role.admin.value,
        token_version=1,
    )["token"]
    assert asyncio.run(admin_ws_mod._authorize_admin(_FakeWS(stale_a))) is False
    assert asyncio.run(admin_ws_mod._authorize_admin(_FakeWS(ok_a))) is True


def test_legacy_jwt_without_claim_treated_as_version_zero(
    client: TestClient, db: Session
) -> None:
    u = _seed_user(db, token_version=0)
    now = datetime.now(timezone.utc)
    legacy = jwt.encode(
        {
            "sub": str(u.id),
            "role": u.role.value,
            "iat": now,
            "exp": now + timedelta(minutes=30),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert token_version_from_claims(decode_access_token(legacy)) == 0
    assert (
        client.get("/auth/me", headers={"Authorization": f"Bearer {legacy}"}).status_code
        == 200
    )

    u.token_version = 1
    db.commit()
    assert (
        client.get("/auth/me", headers={"Authorization": f"Bearer {legacy}"}).status_code
        == 401
    )
