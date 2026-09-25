"""L-AUTH-01: ADMIN_PHONE must not escalate privileges at login."""

from __future__ import annotations

import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import otp as otp_module
from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

PWD = "SecureAuthPass1!"


def _jwt_role(token: str) -> str:
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )
    return str(payload["role"])


def _otp_code_fixed(monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)
    return "100000"


def _seed_user(
    db: Session,
    *,
    phone: str,
    role: Role,
    status: UserStatus = UserStatus.active,
    password: str | None = PWD,
) -> User:
    u = User(
        id=uuid.uuid4(),
        role=role,
        name=f"L-AUTH-{role.value}",
        phone=phone,
        status=status,
        password_hash=hash_password(password) if password else None,
        is_test_account=False,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture(autouse=True)
def _auth_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", False, raising=False)


def test_otp_admin_phone_does_not_promote_passenger(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    code = _otp_code_fixed(monkeypatch)
    _seed_user(db, phone=phone, role=Role.passenger)
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role"] == "passenger"
    assert _jwt_role(body["access_token"]) == "passenger"
    db.expire_all()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.role == Role.passenger
    assert u.status == UserStatus.active


def test_password_admin_phone_does_not_promote(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    _seed_user(db, phone=phone, role=Role.admin)
    r = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role"] == "admin"
    assert _jwt_role(body["access_token"]) == "admin"
    db.expire_all()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.role == Role.admin


def test_downgrade_relogin_does_not_repromote(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """DB role passenger + phone == ADMIN_PHONE → login keeps passenger."""
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    _seed_user(db, phone=phone, role=Role.passenger)
    r = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "passenger"
    assert _jwt_role(r.json()["access_token"]) == "passenger"
    db.expire_all()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.role == Role.passenger


def test_otp_blocked_admin_phone_stays_blocked(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    code = _otp_code_fixed(monkeypatch)
    _seed_user(db, phone=phone, role=Role.passenger, status=UserStatus.blocked)
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 403
    assert r.json()["detail"] == "blocked"
    db.expire_all()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.blocked
    assert u.role == Role.passenger


def test_otp_pending_admin_phone_stays_pending(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 99999, raising=False)
    code = _otp_code_fixed(monkeypatch)
    _seed_user(
        db,
        phone=phone,
        role=Role.passenger,
        status=UserStatus.pending,
        password=None,
    )
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 403
    assert r.json()["detail"] == "pending_approval"
    db.expire_all()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.pending
    assert u.role == Role.passenger


def test_existing_super_admin_unchanged_without_admin_phone(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """super_admin persists from DB even when ADMIN_PHONE is unset."""
    monkeypatch.setattr(settings, "ADMIN_PHONE", None, raising=False)
    phone = unique_test_phone()
    _seed_user(db, phone=phone, role=Role.super_admin)
    code = _otp_code_fixed(monkeypatch)
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "super_admin"
    assert _jwt_role(r.json()["access_token"]) == "super_admin"

    r2 = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert r2.status_code == 200, r2.text
    assert r2.json()["role"] == "super_admin"
    assert _jwt_role(r2.json()["access_token"]) == "super_admin"


def test_existing_super_admin_with_admin_phone_stays_super_admin(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    _seed_user(db, phone=phone, role=Role.super_admin)
    r = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "super_admin"
    assert _jwt_role(r.json()["access_token"]) == "super_admin"


def test_new_otp_user_admin_phone_follows_normal_onboarding(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 99999, raising=False)
    code = _otp_code_fixed(monkeypatch)
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": code, "requested_role": "driver", "accept_legal": True},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "pending_approval"
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.role == Role.passenger
    assert u.status == UserStatus.pending
    assert u.requested_role == "driver"


def test_normal_user_unaffected(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", unique_test_phone(), raising=False)
    phone = unique_test_phone()
    _seed_user(db, phone=phone, role=Role.driver)
    code = _otp_code_fixed(monkeypatch)
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "driver"
    assert _jwt_role(r.json()["access_token"]) == "driver"
