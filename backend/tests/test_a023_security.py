"""
A023 — Security base.

- JWT inválido/expirado/sem exp: sem PostgreSQL (falha no decode antes da BD).
- Token válido + RBAC admin: com PostgreSQL (fixture rbac_tokens).
- /dev e /debug: monkeypatch em settings (guards em tempo de pedido).
- CORS: não testar aqui (só validação manual no browser).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from jwt.exceptions import InvalidTokenError
from sqlalchemy import text

from app.auth.security import create_access_token, decode_access_token
from app.core.config import settings
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import Role, UserStatus


def _postgres_ok() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def rbac_tokens() -> dict[str, str]:
    """Um passageiro e um admin na BD; tokens JWT válidos."""
    if not _postgres_ok():
        pytest.skip("PostgreSQL requerido para testes RBAC")
    db = SessionLocal()
    try:
        suffix = uuid.uuid4().hex[:8]
        passenger = User(
            role=Role.passenger,
            name=f"A023p {suffix}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        admin = User(
            role=Role.admin,
            name=f"A023a {suffix}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(passenger)
        db.add(admin)
        db.commit()
        db.refresh(passenger)
        db.refresh(admin)
        return {
            "passenger": create_access_token(
                subject=str(passenger.id), role=passenger.role.value
            )["token"],
            "admin": create_access_token(subject=str(admin.id), role=admin.role.value)[
                "token"
            ],
        }
    finally:
        db.close()


# --- 1–4 JWT (unit + HTTP sem utilizador na BD) ---


def test_create_access_token_includes_exp_and_sub() -> None:
    out = create_access_token(subject="user-uuid-1", role="passenger")
    payload = jwt.decode(
        out["token"],
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"verify_signature": True},
    )
    assert payload["sub"] == "user-uuid-1"
    assert payload["role"] == "passenger"
    assert "exp" in payload


def test_decode_rejects_expired_token() -> None:
    past = datetime.now(timezone.utc) - timedelta(seconds=30)
    token = jwt.encode(
        {"sub": "u1", "exp": past},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_decode_requires_sub() -> None:
    token = jwt.encode(
        {"exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_decode_rejects_bad_signature() -> None:
    token = jwt.encode(
        {
            "sub": "u1",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "not-the-real-secret-at-least-32-bytes-xx",
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_jwt_invalid_token_http(client: TestClient) -> None:
    r = client.get(
        "/admin/system-health",
        headers={"Authorization": "Bearer totally.not.a.jwt"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_token"


def test_jwt_expired_token_http(client: TestClient) -> None:
    past = datetime.now(timezone.utc) - timedelta(minutes=5)
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "exp": past},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    r = client.get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_token"


def test_jwt_missing_exp_http(client: TestClient) -> None:
    token = jwt.encode(
        {"sub": str(uuid.uuid4())},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    r = client.get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_token"


# --- 5–6 Admin (PostgreSQL) ---


def test_admin_forbidden_for_passenger(
    client: TestClient, rbac_tokens: dict[str, str]
) -> None:
    """Token válido (JWT OK) mas papel ≠ admin → 403."""
    r = client.get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {rbac_tokens['passenger']}"},
    )
    assert r.status_code == 403
    assert r.status_code != 401
    assert r.json()["detail"] == "forbidden"


def test_admin_access_ok(client: TestClient, rbac_tokens: dict[str, str]) -> None:
    r = client.get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {rbac_tokens['admin']}"},
    )
    assert r.status_code == 200


# --- 7–8 Dev / debug (monkeypatch settings no pedido) ---


def test_dev_routes_blocked_when_production_settings(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Simula ENVIRONMENT=production; _require_dev() deve responder 404."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    r = client.post("/dev/reset")
    assert r.status_code == 404


def test_dev_routes_blocked_in_production_even_if_enable_dev_tools_true(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """RFC R7: produção nunca monta /dev/* mesmo com ENABLE_DEV_TOOLS=True."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    assert settings.dev_tools_router_enabled() is False
    r = client.post("/dev/seed")
    assert r.status_code == 404


def test_debug_routes_blocked_production_without_beta(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    rid = uuid.uuid4()
    r = client.get(f"/debug/trip/{rid}/logs")
    assert r.status_code == 404
    assert r.json().get("detail") == "debug_not_available"


def test_debug_driver_locations_blocked_in_production(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """_require_dev: em produção bloqueia mesmo com BETA_MODE."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    r = client.get("/debug/driver-locations")
    assert r.status_code == 404
