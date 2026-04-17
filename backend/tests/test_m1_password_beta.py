"""M1: palavra-passe opcional por utilizador (bcrypt) + login BETA."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password, verify_password
from app.core.config import settings
from app.db.models.user import User
from app.models.enums import Role, UserStatus


def _unique_beta_phone() -> str:
    """+351 + 9 dígitos (regex BETA); evita colisão em BD partilhada entre corridas de teste."""
    return f"+351{uuid.uuid4().int % 10**9:09d}"


def test_password_hash_roundtrip() -> None:
    h = hash_password("MySecret12")
    assert verify_password("MySecret12", h)
    assert not verify_password("wrong", h)


def test_login_rejects_default_when_hash_set(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "DEFAULT_PASSWORD", "123456", raising=False)
    phone = _unique_beta_phone()
    u = User(
        id=uuid.uuid4(),
        role=Role.passenger,
        name="PwdTester",
        phone=phone,
        status=UserStatus.active,
        password_hash=hash_password("Custompass1"),
    )
    db.add(u)
    db.commit()

    ok = client.post("/auth/login", json={"phone": phone, "password": "Custompass1"})
    assert ok.status_code == 200
    assert ok.json().get("display_name") == "PwdTester"

    bad = client.post("/auth/login", json={"phone": phone, "password": "123456"})
    assert bad.status_code == 401


def test_change_password_beta_requires_current_when_hash_exists(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    phone = _unique_beta_phone()
    u = User(
        id=uuid.uuid4(),
        role=Role.passenger,
        name="Chg",
        phone=phone,
        status=UserStatus.active,
        password_hash=hash_password("Oldpass123"),
    )
    db.add(u)
    db.commit()

    tok = client.post(
        "/auth/login", json={"phone": phone, "password": "Oldpass123"}
    ).json()["access_token"]

    bad = client.post(
        "/auth/me/password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"new_password": "Newpass123"},
    )
    assert bad.status_code == 400
    assert bad.json()["detail"] == "invalid_current_password"

    good = client.post(
        "/auth/me/password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": "Oldpass123", "new_password": "Newpass456"},
    )
    assert good.status_code == 200

    login_new = client.post(
        "/auth/login", json={"phone": phone, "password": "Newpass456"}
    )
    assert login_new.status_code == 200


def test_me_password_unauthenticated(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    r = client.post("/auth/me/password", json={"new_password": "abcdefgh"})
    assert r.status_code == 401


def test_me_get_unauthenticated(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert client.get("/auth/me").status_code == 401


def test_me_get_and_patch_name_beta(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "DEFAULT_PASSWORD", "123456", raising=False)
    phone = _unique_beta_phone()
    u = User(
        id=uuid.uuid4(),
        role=Role.passenger,
        name="NomeAntigo",
        phone=phone,
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()

    tok = client.post(
        "/auth/login", json={"phone": phone, "password": "123456"}
    ).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    r = client.get("/auth/me", headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["phone"] == phone
    assert data["name"] == "NomeAntigo"
    assert data["has_custom_password"] is False

    p = client.patch("/auth/me", headers=h, json={"name": "Nome Novo M1"})
    assert p.status_code == 200, p.text
    assert p.json()["name"] == "Nome Novo M1"

    login2 = client.post("/auth/login", json={"phone": phone, "password": "123456"})
    assert login2.status_code == 200
    assert login2.json().get("display_name") == "Nome Novo M1"
