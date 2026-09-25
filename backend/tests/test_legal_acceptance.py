"""M2.11 versioned legal acceptance."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routers import auth as auth_module
from app.auth.otp import hash_otp_code
from app.auth.security import create_access_token
from app.core.config import settings
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.db.models.user_legal_acceptance import LegalAcceptanceSource, UserLegalAcceptance
from app.models.enums import Role, UserStatus
from app.services.legal_acceptance import acceptance_required, record_acceptance
from tests.support.unique_phone import unique_test_phone


def _user(db: Session, **extra: object) -> User:
    user = User(
        role=Role.passenger,
        name="Legal Acceptance",
        phone=unique_test_phone(),
        status=UserStatus.active,
        **extra,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _headers(user: User) -> dict[str, str]:
    token = create_access_token(subject=str(user.id), role=user.role.value)["token"]
    return {"Authorization": f"Bearer {token}"}


def _non_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)


def test_no_acceptance_is_required(client: TestClient, db: Session) -> None:
    user = _user(db)
    res = client.get("/auth/legal-acceptance", headers=_headers(user))
    assert res.status_code == 200
    body = res.json()
    assert body["required"] is True
    assert body["terms_version"] == settings.CURRENT_TERMS_VERSION
    assert body["privacy_version"] == settings.CURRENT_PRIVACY_VERSION


def test_login_reaccept_then_current_is_enough(client: TestClient, db: Session) -> None:
    user = _user(db)
    headers = _headers(user)
    res = client.post(
        "/auth/legal-acceptance",
        json={"source": "login_reaccept", "terms_version": "client-must-not-win"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["required"] is False
    db.expire_all()
    row = db.execute(
        select(UserLegalAcceptance).where(UserLegalAcceptance.user_id == user.id)
    ).scalar_one()
    assert row.source == LegalAcceptanceSource.login_reaccept.value
    assert row.terms_version == settings.CURRENT_TERMS_VERSION
    assert row.accepted_at is not None
    again = client.get("/auth/legal-acceptance", headers=headers)
    assert again.json()["required"] is False


def test_terms_or_privacy_change_requires_reaccept(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = _user(db)
    record_acceptance(db, user.id, LegalAcceptanceSource.login_reaccept)
    db.commit()
    assert acceptance_required(db, user.id) is False
    original_terms = settings.CURRENT_TERMS_VERSION
    original_privacy = settings.CURRENT_PRIVACY_VERSION
    monkeypatch.setattr(settings, "CURRENT_TERMS_VERSION", "2099-01-01")
    assert acceptance_required(db, user.id) is True
    monkeypatch.setattr(settings, "CURRENT_TERMS_VERSION", original_terms)
    monkeypatch.setattr(settings, "CURRENT_PRIVACY_VERSION", "2099-02-02")
    assert acceptance_required(db, user.id) is True
    monkeypatch.setattr(settings, "CURRENT_PRIVACY_VERSION", original_privacy)
    assert acceptance_required(db, user.id) is False


def test_invalid_source_and_missing_auth(client: TestClient, db: Session) -> None:
    user = _user(db)
    headers = _headers(user)
    bad = client.post(
        "/auth/legal-acceptance", json={"source": "register_google"}, headers=headers
    )
    assert bad.status_code == 422
    assert bad.json()["detail"] == "invalid_legal_acceptance_source"
    assert client.get("/auth/legal-acceptance").status_code == 401
    assert (
        client.post("/auth/legal-acceptance", json={"source": "login_reaccept"}).status_code
        == 401
    )


def test_history_is_preserved_when_versions_change(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = _user(db)
    record_acceptance(db, user.id, LegalAcceptanceSource.register_google)
    db.commit()
    monkeypatch.setattr(settings, "CURRENT_TERMS_VERSION", "2099-03-03")
    record_acceptance(db, user.id, LegalAcceptanceSource.login_reaccept)
    db.commit()
    db.expire_all()
    rows = db.execute(
        select(UserLegalAcceptance)
        .where(UserLegalAcceptance.user_id == user.id)
        .order_by(UserLegalAcceptance.accepted_at.asc(), UserLegalAcceptance.id.asc())
    ).scalars().all()
    assert len(rows) == 2
    assert rows[0].terms_version == "2026-09-16"
    assert rows[0].source == LegalAcceptanceSource.register_google.value
    assert rows[1].terms_version == "2099-03-03"
    assert rows[1].source == LegalAcceptanceSource.login_reaccept.value
    assert acceptance_required(db, user.id) is False


def test_otp_new_user_requires_acceptance_without_consuming(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    db.add(
        OtpCode(
            phone=phone,
            code_hash=hash_otp_code(phone, "123456"),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
    )
    db.commit()
    denied = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "accept_legal": False},
    )
    assert denied.status_code == 400
    assert denied.json()["detail"] == "legal_acceptance_required"
    db.expire_all()
    assert db.execute(select(User).where(User.phone == phone)).scalar_one_or_none() is None
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is None

    ok = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "accept_legal": True},
    )
    assert ok.status_code == 200, ok.text
    db.expire_all()
    created = db.execute(select(User).where(User.phone == phone)).scalar_one()
    acceptance = db.execute(
        select(UserLegalAcceptance).where(UserLegalAcceptance.user_id == created.id)
    ).scalar_one()
    assert acceptance.source == LegalAcceptanceSource.register_otp.value
    consumed = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert consumed.consumed_at is not None


def test_deployed_otp_stays_unavailable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    res = client.post(
        "/auth/otp/verify",
        json={"phone": "+351910000001", "code": "123456", "accept_legal": True},
    )
    assert res.status_code == 503


def test_google_new_account_requires_acceptance_and_records_source(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = f"m211-{unique_test_phone()[1:]}@example.com"
    sub = f"sub-{unique_test_phone()[1:]}"

    async def _exchange(**_kwargs: object) -> dict[str, str]:
        return {"id_token": "fake"}

    def _claims(_token: str) -> dict[str, object]:
        return {
            "sub": sub,
            "email": email,
            "email_verified": True,
            "name": "Nova Conta",
        }

    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 1_000_000, raising=False)
    monkeypatch.setattr(auth_module, "exchange_code_for_id_token", _exchange)
    monkeypatch.setattr(auth_module, "verify_id_token_claims", _claims)

    body = {
        "code": "dummy",
        "redirect_uri": "http://localhost:5173/auth/google/callback",
        "accept_legal": False,
    }
    denied = client.post("/auth/google/exchange", json=body)
    assert denied.status_code == 400
    assert denied.json()["detail"] == "legal_acceptance_required"
    db.expire_all()
    assert (
        db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
        is None
    )

    created = client.post("/auth/google/exchange", json={**body, "accept_legal": True})
    assert created.status_code == 403
    assert created.json()["detail"] == "pending_approval"
    db.expire_all()
    user = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one()
    acceptance = db.execute(
        select(UserLegalAcceptance).where(UserLegalAcceptance.user_id == user.id)
    ).scalar_one()
    assert acceptance.source == LegalAcceptanceSource.register_google.value
    assert acceptance.terms_version == settings.CURRENT_TERMS_VERSION


def test_google_existing_user_does_not_need_register_acceptance(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = f"existing-{unique_test_phone()[1:]}@example.com"
    sub = f"existing-{unique_test_phone()[1:]}"
    user = _user(db, email=email, oauth_google_sub=sub)

    async def _exchange(**_kwargs: object) -> dict[str, str]:
        return {"id_token": "fake"}

    def _claims(_token: str) -> dict[str, object]:
        return {"sub": sub, "email": email, "email_verified": True, "name": "Existente"}

    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    monkeypatch.setattr(auth_module, "exchange_code_for_id_token", _exchange)
    monkeypatch.setattr(auth_module, "verify_id_token_claims", _claims)

    res = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
            "accept_legal": False,
        },
    )
    assert res.status_code == 200, res.text
    db.expire_all()
    count = db.execute(
        select(func.count())
        .select_from(UserLegalAcceptance)
        .where(UserLegalAcceptance.user_id == user.id)
    ).scalar_one()
    assert count == 0
