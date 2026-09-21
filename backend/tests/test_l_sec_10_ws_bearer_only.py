"""L-SEC-10: WebSocket auth accepts Bearer only — no ?token= query fallback."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routers import admin_ws as admin_ws_mod
from app.api.routers import ws as ws_mod
from app.auth.passwords import hash_password
from app.auth.security import create_access_token
from app.db.models.user import User
from app.db.session import engine
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone
from tests.test_l_sec_13_token_version import _FakeWS


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_user(
    db: Session,
    *,
    role: Role = Role.driver,
    status: UserStatus = UserStatus.active,
    token_version: int = 0,
) -> User:
    u = User(
        role=role,
        name=f"LSec10 {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=status,
        password_hash=hash_password("UnusedPass123"),
        token_version=token_version,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _jwt(user: User, *, token_version: int | None = None) -> str:
    return create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=(
            int(user.token_version) if token_version is None else token_version
        ),
    )["token"]


def test_a_bearer_valid_accepted(db: Session) -> None:
    u = _seed_user(db, role=Role.driver)
    tok = _jwt(u)
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(tok))) == str(u.id)

    admin = _seed_user(db, role=Role.admin)
    assert (
        asyncio.run(admin_ws_mod._authorize_admin(_FakeWS(_jwt(admin)))) is True
    )


def test_b_query_token_only_rejected(db: Session) -> None:
    u = _seed_user(db, role=Role.driver)
    tok = _jwt(u)
    # Valid JWT in query only — must be rejected after L-SEC-10
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(query_token=tok))) is None

    admin = _seed_user(db, role=Role.admin)
    assert (
        asyncio.run(
            admin_ws_mod._authorize_admin(_FakeWS(query_token=_jwt(admin)))
        )
        is False
    )


def test_c_bearer_invalid_rejected(db: Session) -> None:
    assert (
        asyncio.run(ws_mod._authorize_driver(_FakeWS("not-a-valid-jwt"))) is None
    )
    assert (
        asyncio.run(admin_ws_mod._authorize_admin(_FakeWS("not-a-valid-jwt")))
        is False
    )


def test_d_token_version_mismatch_still_rejected(db: Session) -> None:
    u = _seed_user(db, role=Role.driver, token_version=2)
    stale = _jwt(u, token_version=0)
    ok = _jwt(u, token_version=2)
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(stale))) is None
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(ok))) == str(u.id)


def test_e_blocked_user_rejected(db: Session) -> None:
    u = _seed_user(db, role=Role.driver, status=UserStatus.blocked)
    tok = _jwt(u)
    assert asyncio.run(ws_mod._authorize_driver(_FakeWS(tok))) is None

    admin = _seed_user(db, role=Role.admin, status=UserStatus.blocked)
    assert asyncio.run(admin_ws_mod._authorize_admin(_FakeWS(_jwt(admin)))) is False
