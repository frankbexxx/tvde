"""L-SEC-17: OTP endpoints are unavailable in deployed environments."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import otp as otp_module
from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

PWD = "SecurePass1"


def _otp_count(db: Session, phone: str) -> int:
    return int(
        db.execute(
            select(func.count()).select_from(OtpCode).where(OtpCode.phone == phone)
        ).scalar()
        or 0
    )


def test_deployed_otp_request_unavailable_and_writes_nothing(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    phone = unique_test_phone()
    before = _otp_count(db, phone)

    r = client.post("/auth/otp/request", json={"phone": phone})

    assert r.status_code == 503
    assert r.json()["detail"] == "otp_auth_unavailable"
    db.expire_all()
    assert _otp_count(db, phone) == before


def test_deployed_otp_verify_unavailable_and_issues_no_jwt(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    phone = unique_test_phone()

    r = client.post("/auth/otp/verify", json={"phone": phone, "code": "123456"})

    assert r.status_code == 503
    assert r.json()["detail"] == "otp_auth_unavailable"
    assert "access_token" not in r.json()


def test_non_deployed_otp_request_still_creates_row(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 99999, raising=False)
    phone = unique_test_phone()

    r = client.post("/auth/otp/request", json={"phone": phone})

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request_id"]
    db.expire_all()
    assert _otp_count(db, phone) == 1


def test_non_deployed_otp_verify_still_issues_token(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)
    phone = unique_test_phone()

    requested = client.post("/auth/otp/request", json={"phone": phone})
    assert requested.status_code == 200, requested.text

    verified = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "100000", "accept_legal": True},
    )

    assert verified.status_code == 200, verified.text
    assert verified.json()["access_token"]
    db.expire_all()
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is not None


def test_password_login_unaffected_when_otp_disabled(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    phone = unique_test_phone()
    user = User(
        id=uuid.uuid4(),
        role=Role.passenger,
        name="L-SEC-17 password",
        phone=phone,
        status=UserStatus.active,
        is_test_account=False,
        password_hash=hash_password(PWD),
    )
    db.add(user)
    db.commit()

    ok = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert ok.status_code == 200, ok.text
    assert ok.json()["access_token"]

    bad = client.post("/auth/login", json={"phone": phone, "password": "wrong-pass"})
    assert bad.status_code == 401
    assert bad.json()["detail"] == "invalid_credentials"


def test_google_config_and_exchange_unaffected_when_otp_disabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "g-id", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "g-sec", raising=False)

    cfg = client.get("/config")
    assert cfg.status_code == 200
    body = cfg.json()
    assert body["google_oauth_enabled"] is True
    assert body["google_oauth_client_id"] == "g-id"

    exchange = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
        },
    )
    assert exchange.status_code == 400
    assert exchange.json()["detail"] in ("google_exchange_failed", "google_token_invalid")
    assert exchange.json()["detail"] != "otp_auth_unavailable"
