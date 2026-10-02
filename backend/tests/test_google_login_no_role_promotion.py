"""Google autentica a conta existente. Não promove papel a partir do ecrã."""

from __future__ import annotations

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routers import auth as auth_module
from app.core.config import settings
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

RAW_NONCE = "0123456789abcdef0123456789abcdef"
HASHED_NONCE = hashlib.sha256(RAW_NONCE.encode("utf-8")).hexdigest()


def _ids() -> tuple[str, str]:
    token = unique_test_phone()[1:]
    return f"sub-{token}", f"g-{token}@example.com"


def _claims(sub: str, email: str) -> dict:
    return {
        "sub": sub,
        "email": email,
        "email_verified": True,
        "name": "Conta Google",
        "nonce": HASHED_NONCE,
    }


def _patch(monkeypatch: pytest.MonkeyPatch, claims: dict) -> None:
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 1_000_000, raising=False)
    monkeypatch.setattr(auth_module, "verify_id_token_claims", lambda _token: claims)


def _user(db: Session, role: Role, sub: str, email: str) -> User:
    user = User(
        role=role,
        name=role.value,
        phone=unique_test_phone(),
        email=email,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(
        UserIdentity(
            user_id=user.id,
            provider="google",
            email=email,
            provider_subject=sub,
            is_primary=True,
            is_verified=True,
        )
    )
    db.commit()
    return user


def _login(client: TestClient, requested_role: str) -> object:
    return client.post(
        "/auth/google/id-token",
        json={
            "id_token": "header.payload.signature-not-logged",
            "nonce": RAW_NONCE,
            "requested_role": requested_role,
        },
    )


@pytest.mark.parametrize(
    ("role", "screen"),
    [
        (Role.passenger, "driver"),
        (Role.passenger, "admin"),
        (Role.passenger, "partner"),
        (Role.driver, "admin"),
        (Role.driver, "partner"),
        (Role.partner, "driver"),
        (Role.partner, "admin"),
        (Role.admin, "driver"),
        (Role.admin, "passenger"),
    ],
)
def test_google_login_keeps_existing_role(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    role: Role,
    screen: str,
) -> None:
    sub, email = _ids()
    user = _user(db, role, sub, email)
    _patch(monkeypatch, _claims(sub, email))

    response = _login(client, screen)
    assert response.status_code == 200, response.text
    assert response.json()["role"] == role.value

    db.expire_all()
    stored = db.get(User, user.id)
    assert stored is not None
    assert stored.role == role


def test_new_google_account_is_passenger_even_from_admin_screen(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    _patch(monkeypatch, _claims(sub, email))
    before = db.execute(select(func.count()).select_from(User)).scalar_one()

    choice = _login(client, "admin")
    assert choice.status_code == 409
    assert choice.json()["detail"]["code"] == "google_account_choice_required"
    assert db.execute(select(func.count()).select_from(User)).scalar_one() == before

    created = client.post(
        "/auth/google/onboarding",
        json={
            "id_token": "header.payload.signature-not-logged",
            "nonce": RAW_NONCE,
            "name": "Nova Conta",
            "phone": unique_test_phone(),
            "accept_legal": True,
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["role"] == Role.passenger.value
    stored = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one()
    assert stored.role == Role.passenger
