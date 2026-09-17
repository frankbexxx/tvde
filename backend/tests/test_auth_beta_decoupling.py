"""Phase B1: auth real independente de BETA_MODE (login / Google / me / password)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

PWD = "SecurePass1"


def _mk_user(
    db: Session,
    *,
    role: Role = Role.passenger,
    password: str = PWD,
    is_test: bool = False,
) -> User:
    phone = unique_test_phone()
    u = User(
        id=uuid.uuid4(),
        role=role,
        name=f"B1-{role.value}",
        phone=phone,
        status=UserStatus.active,
        is_test_account=is_test,
        password_hash=hash_password(password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.mark.parametrize("beta", [True, False])
def test_password_login_available_regardless_of_beta(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, beta: bool
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    u = _mk_user(db, role=Role.passenger)
    ok = client.post("/auth/login", json={"phone": u.phone, "password": PWD})
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body["role"] == "passenger"
    assert body["user_id"] == str(u.id)
    assert body.get("display_name") == u.name

    bad = client.post("/auth/login", json={"phone": u.phone, "password": "wrong-pass"})
    assert bad.status_code == 401
    assert bad.json()["detail"] == "invalid_credentials"


@pytest.mark.parametrize("beta", [True, False])
def test_login_preserves_role_driver_partner_admin(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, beta: bool
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    for role in (Role.driver, Role.partner, Role.admin):
        u = _mk_user(db, role=role)
        r = client.post("/auth/login", json={"phone": u.phone, "password": PWD})
        assert r.status_code == 200, (role, r.text)
        assert r.json()["role"] == role.value


@pytest.mark.parametrize("beta", [True, False])
def test_me_get_patch_password_available_regardless_of_beta(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, beta: bool
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    u = _mk_user(db)
    tok = client.post("/auth/login", json={"phone": u.phone, "password": PWD}).json()[
        "access_token"
    ]
    h = {"Authorization": f"Bearer {tok}"}

    me = client.get("/auth/me", headers=h)
    assert me.status_code == 200, me.text
    assert me.json()["phone"] == u.phone
    assert me.json()["has_custom_password"] is True

    patched = client.patch("/auth/me", headers=h, json={"name": "Nome B1"})
    assert patched.status_code == 200, patched.text
    assert patched.json()["name"] == "Nome B1"

    bad_pw = client.post(
        "/auth/me/password",
        headers=h,
        json={"new_password": "NewPass999"},
    )
    assert bad_pw.status_code == 400
    assert bad_pw.json()["detail"] == "invalid_current_password"

    ok_pw = client.post(
        "/auth/me/password",
        headers=h,
        json={"current_password": PWD, "new_password": "NewPass999"},
    )
    assert ok_pw.status_code == 200

    relogin = client.post(
        "/auth/login", json={"phone": u.phone, "password": "NewPass999"}
    )
    assert relogin.status_code == 200


@pytest.mark.parametrize("beta", [True, False])
def test_me_rejects_invalid_jwt_regardless_of_beta(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, beta: bool
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    r = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


@pytest.mark.parametrize("beta", [True, False])
def test_google_exchange_available_and_passenger_only(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, beta: bool
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)

    driver = client.post(
        "/auth/google/exchange",
        json={
            "code": "x",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
            "requested_role": "driver",
        },
    )
    assert driver.status_code == 403
    assert driver.json()["detail"] == "google_login_passenger_only"

    passenger = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
        },
    )
    assert passenger.status_code == 400
    assert passenger.json()["detail"] in (
        "google_exchange_failed",
        "google_token_invalid",
    )


def test_beta_false_does_not_open_dev_routes(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Abrir auth com BETA=false não implica abrir /dev em produção."""
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)

    # Auth disponível (telefone inexistente → 401, não 404)
    phone = unique_test_phone()
    assert (
        client.post(
            "/auth/login", json={"phone": phone, "password": "nope"}
        ).status_code
        == 401
    )

    assert settings.dev_tools_router_enabled() is False
    assert client.post("/dev/tokens").status_code == 404
    assert client.post("/dev/seed").status_code == 404


def test_login_does_not_escalate_role_via_requested_role(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    u = _mk_user(db, role=Role.passenger)
    r = client.post(
        "/auth/login",
        json={
            "phone": u.phone,
            "password": PWD,
            "requested_role": "admin",
        },
    )
    assert r.status_code == 200
    assert r.json()["role"] == "passenger"
