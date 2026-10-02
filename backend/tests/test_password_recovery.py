"""Recuperação de palavra-passe. Não revela contas e não muda o papel."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routers import auth as auth_module
from app.auth.otp import hash_reset_otp_code
from app.auth.passwords import hash_password, verify_password
from app.core.config import settings
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

OLD = "OldPass12"
NEW = "NovaPass12"
CODE = "654321"


def _ready(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(auth_module, "generate_otp_code", lambda: CODE)


def _user(db: Session, role: Role, *, password: str | None = OLD) -> User:
    user = User(
        role=role,
        name=role.value,
        phone=unique_test_phone(),
        status=UserStatus.active,
        password_hash=hash_password(password) if password else None,
        is_test_account=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _otp_count(db: Session, phone: str) -> int:
    return int(
        db.execute(select(func.count()).select_from(OtpCode).where(OtpCode.phone == phone)).scalar()
        or 0
    )


def _recover(client: TestClient, phone: str, code: str = CODE) -> str:
    requested = client.post("/auth/password/forgot", json={"phone": phone})
    assert requested.status_code == 200, requested.text
    assert requested.json() == {"status": "accepted"}
    assert CODE not in requested.text
    verified = client.post(
        "/auth/password/forgot/verify",
        json={"phone": phone, "code": code},
    )
    assert verified.status_code == 200, verified.text
    token = verified.json()["reset_token"]
    assert "access_token" not in verified.json()
    return token


@pytest.mark.parametrize("role", [Role.passenger, Role.driver, Role.partner, Role.admin])
def test_reset_keeps_role_and_replaces_password(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, role: Role
) -> None:
    _ready(monkeypatch)
    user = _user(db, role)
    version = int(user.token_version or 0)
    proof = _recover(client, user.phone)
    done = client.post(
        "/auth/password/forgot/complete",
        json={"reset_token": proof, "new_password": NEW, "confirm_password": NEW},
    )
    assert done.status_code == 200, done.text
    assert done.json() == {"status": "accepted"}
    assert "access_token" not in done.json()
    db.expire_all()
    stored = db.get(User, user.id)
    assert stored is not None
    assert stored.role == role
    assert int(stored.token_version) == version + 1
    assert verify_password(NEW, stored.password_hash)
    assert not verify_password(OLD, stored.password_hash)
    login = client.post("/auth/login", json={"phone": user.phone, "password": NEW})
    assert login.status_code == 200, login.text
    assert login.json()["role"] == role.value
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {proof}"})
    assert me.status_code == 401


def test_missing_phone_matches_existing_phone_and_google_only_gets_no_code(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _ready(monkeypatch)
    existing = _user(db, Role.passenger)
    google_only = _user(db, Role.passenger, password=None)
    missing = unique_test_phone()
    bodies = []
    for phone in (existing.phone, missing, google_only.phone):
        response = client.post("/auth/password/forgot", json={"phone": phone})
        assert response.status_code == 200
        bodies.append(response.json())
        assert "não" not in response.text.lower()
        assert CODE not in response.text
    assert bodies[0] == bodies[1] == bodies[2]
    db.expire_all()
    assert _otp_count(db, existing.phone) == 1
    assert _otp_count(db, missing) == 0
    assert _otp_count(db, google_only.phone) == 0
    denied = client.post(
        "/auth/password/forgot/verify",
        json={"phone": google_only.phone, "code": CODE},
    )
    assert denied.status_code == 401
    assert denied.json()["detail"] == "invalid_otp"


def test_wrong_expired_and_reused_codes(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _ready(monkeypatch)
    user = _user(db, Role.driver)
    client.post("/auth/password/forgot", json={"phone": user.phone})
    wrong = client.post(
        "/auth/password/forgot/verify",
        json={"phone": user.phone, "code": "000000"},
    )
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "invalid_otp"
    login_otp = client.post(
        "/auth/otp/verify",
        json={"phone": user.phone, "code": CODE, "accept_legal": True},
    )
    assert login_otp.status_code == 401
    proof = _recover(client, user.phone)
    mismatch = client.post(
        "/auth/password/forgot/complete",
        json={"reset_token": proof, "new_password": NEW, "confirm_password": "OutraPass12"},
    )
    assert mismatch.status_code == 400
    assert mismatch.json()["detail"] == "password_mismatch"
    short = client.post(
        "/auth/password/forgot/complete",
        json={"reset_token": proof, "new_password": "curta", "confirm_password": "curta"},
    )
    assert short.status_code == 422
    done = client.post(
        "/auth/password/forgot/complete",
        json={"reset_token": proof, "new_password": NEW, "confirm_password": NEW},
    )
    assert done.status_code == 200
    again = client.post(
        "/auth/password/forgot/complete",
        json={"reset_token": proof, "new_password": NEW, "confirm_password": NEW},
    )
    assert again.status_code == 401
    assert again.json()["detail"] == "reset_proof_used"
    invalid = client.post(
        "/auth/password/forgot/complete",
        json={
            "reset_token": "not-a-real-proof-token-value",
            "new_password": NEW,
            "confirm_password": NEW,
        },
    )
    assert invalid.status_code == 401
    assert invalid.json()["detail"] == "reset_proof_invalid"

    expired_phone = unique_test_phone()
    expired_user = User(
        role=Role.passenger,
        name="expirado",
        phone=expired_phone,
        status=UserStatus.active,
        password_hash=hash_password(OLD),
        is_test_account=False,
    )
    db.add(expired_user)
    db.flush()
    db.add(
        OtpCode(
            phone=expired_phone,
            code_hash=hash_reset_otp_code(expired_phone, CODE),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
    )
    db.commit()
    expired = client.post(
        "/auth/password/forgot/verify",
        json={"phone": expired_phone, "code": CODE},
    )
    assert expired.status_code == 401
    assert expired.json()["detail"] == "invalid_otp"


def test_deployed_recovery_is_unavailable_and_writes_nothing(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    user = _user(db, Role.passenger)
    before = _otp_count(db, user.phone)
    response = client.post("/auth/password/forgot", json={"phone": user.phone})
    assert response.status_code == 503
    assert response.json()["detail"] == "otp_auth_unavailable"
    db.expire_all()
    assert _otp_count(db, user.phone) == before


def test_recovery_request_rate_limit(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _ready(monkeypatch)
    user = _user(db, Role.passenger)
    statuses = [
        client.post("/auth/password/forgot", json={"phone": user.phone}).status_code
        for _ in range(13)
    ]
    assert statuses[:12] == [200] * 12
    assert statuses[12] == 429
