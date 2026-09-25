"""L-SEC-12: one OTP row can be consumed by only one verify."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routers import auth as auth_module
from app.auth import otp as otp_module
from app.main import app
from app.auth.otp import hash_otp_code
from app.core.config import settings
from app.db.models.otp import OtpCode
from tests.support.unique_phone import unique_test_phone


def _non_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)


def _request_known_code(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, phone: str
) -> None:
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)
    requested = client.post("/auth/otp/request", json={"phone": phone})
    assert requested.status_code == 200, requested.text


def test_valid_otp_consumes_once(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    _request_known_code(client, monkeypatch, phone)

    verified = client.post("/auth/otp/verify", json={"phone": phone, "code": "100000"})

    assert verified.status_code == 200, verified.text
    assert verified.json()["access_token"]
    db.expire_all()
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is not None


def test_invalid_otp_does_not_consume(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    _request_known_code(client, monkeypatch, phone)

    verified = client.post("/auth/otp/verify", json={"phone": phone, "code": "000000"})

    assert verified.status_code == 401
    assert verified.json()["detail"] == "invalid_otp"
    assert "access_token" not in verified.json()
    db.expire_all()
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is None


def test_expired_otp_does_not_consume(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    db.add(
        OtpCode(
            phone=phone,
            code_hash=hash_otp_code(phone, "100000"),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
    )
    db.commit()

    verified = client.post("/auth/otp/verify", json={"phone": phone, "code": "100000"})

    assert verified.status_code == 401
    assert verified.json()["detail"] == "invalid_otp"
    assert "access_token" not in verified.json()
    db.expire_all()
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is None


def test_second_verify_fails_and_issues_no_jwt(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    _request_known_code(client, monkeypatch, phone)
    body = {"phone": phone, "code": "100000"}

    first = client.post("/auth/otp/verify", json=body)
    second = client.post("/auth/otp/verify", json=body)

    assert first.status_code == 200, first.text
    assert first.json()["access_token"]
    assert second.status_code == 401
    assert second.json()["detail"] == "invalid_otp"
    assert "access_token" not in second.json()
    db.expire_all()
    rows = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalars().all()
    assert len(rows) == 1
    assert rows[0].consumed_at is not None


def test_concurrent_verify_one_winner(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _non_prod(monkeypatch)
    phone = unique_test_phone()
    _request_known_code(client, monkeypatch, phone)
    barrier = Barrier(2, timeout=5)
    original = auth_module.claim_unconsumed_otp

    def claim_after_both_arrive(session, otp_id, now):
        barrier.wait()
        return original(session, otp_id, now)

    monkeypatch.setattr(auth_module, "claim_unconsumed_otp", claim_after_both_arrive)

    def verify() -> tuple[int, dict]:
        with TestClient(app) as local:
            response = local.post(
                "/auth/otp/verify", json={"phone": phone, "code": "100000"}
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _i: verify(), (1, 2)))

    statuses = sorted(code for code, _body in outcomes)
    assert statuses == [200, 401]
    winner = next(body for code, body in outcomes if code == 200)
    loser = next(body for code, body in outcomes if code == 401)
    assert winner["access_token"]
    assert "access_token" not in loser
    assert loser["detail"] == "invalid_otp"
    db.expire_all()
    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is not None
    consumed = db.execute(
        select(func.count())
        .select_from(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed_at.is_not(None))
    ).scalar()
    assert consumed == 1


def test_deployed_verify_stays_unavailable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    phone = unique_test_phone()

    response = client.post(
        "/auth/otp/verify", json={"phone": phone, "code": "100000"}
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "otp_auth_unavailable"
    assert "access_token" not in response.json()
