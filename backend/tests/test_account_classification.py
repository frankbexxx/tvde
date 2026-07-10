"""Test vs real account login (MVP)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password, verify_password
from app.core.config import settings
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus

TEST_PWD = "demo1234"


def _unique_beta_phone() -> str:
    return f"+351{uuid.uuid4().int % 10**9:09d}"


def _patch_test_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)


def test_test_account_login_with_beta(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_test_password(monkeypatch)
    phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Tester",
            phone=phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(TEST_PWD),
        )
    )
    db.commit()

    ok = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    assert ok.status_code == 200


def test_test_account_blocked_without_beta(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Tester",
            phone=phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(TEST_PWD),
        )
    )
    db.commit()

    r = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    # Login BETA endpoint is not mounted when BETA_MODE=false.
    assert r.status_code == 404


def test_test_account_without_hash_rejected(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_test_password(monkeypatch)
    phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Tester",
            phone=phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=None,
        )
    )
    db.commit()

    r = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    assert r.status_code == 401
    assert r.json()["detail"] == "test_account_password_not_set"


def test_real_account_without_hash_rejected(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_test_password(monkeypatch)
    phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Real",
            phone=phone,
            status=UserStatus.active,
            is_test_account=False,
            password_hash=None,
        )
    )
    db.commit()

    r = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    assert r.status_code == 401
    assert r.json()["detail"] == "password_not_set"


def test_real_account_rejects_global_test_password(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_test_password(monkeypatch)
    phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Real",
            phone=phone,
            status=UserStatus.active,
            is_test_account=False,
            password_hash=hash_password("MyOwnPass1"),
        )
    )
    db.commit()

    r = client.post("/auth/login", json={"phone": phone, "password": TEST_PWD})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_credentials"


def test_unknown_login_does_not_create_pending_user_or_consume_beta_capacity(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_test_password(monkeypatch)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 1, raising=False)
    db.add(
        User(
            role=Role.passenger,
            name="Tester",
            phone=_unique_beta_phone(),
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(TEST_PWD),
        )
    )
    db.commit()

    phone = _unique_beta_phone()
    r = client.post(
        "/auth/login",
        json={"phone": phone, "password": TEST_PWD, "requested_role": "passenger"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_credentials"

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    assert user is None


def test_otp_verify_persists_pending_beta_user_for_admin_approval(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 99999, raising=False)
    phone = _unique_beta_phone()

    requested = client.post(
        "/auth/otp/request",
        json={"phone": phone, "requested_role": "driver"},
    )
    assert requested.status_code == 200

    verified = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "requested_role": "driver"},
    )
    assert verified.status_code == 403
    assert verified.json()["detail"] == "pending_approval"

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    assert user is not None
    assert user.status == UserStatus.pending
    assert user.requested_role == "driver"

    otp = db.execute(select(OtpCode).where(OtpCode.phone == phone)).scalar_one()
    assert otp.consumed_at is not None


def test_owner_phone_stays_real_in_seed_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner = "+351924075365"
    monkeypatch.setattr(settings, "ADMIN_PHONE", owner, raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    from app.services.baseline_reset import seed_user_auth_fields

    owner_fields = seed_user_auth_fields(owner)
    assert owner_fields["is_test_account"] is False
    assert "password_hash" not in owner_fields

    test_fields = seed_user_auth_fields("+351912345678")
    assert test_fields["is_test_account"] is True
    assert test_fields["password_hash"]


def test_baseline_seed_marks_test_accounts(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    from app.services.baseline_reset import run_full_baseline_reset

    run_full_baseline_reset(db)
    users = db.execute(select(User)).scalars().all()
    by_phone = {u.phone: u for u in users}
    assert by_phone["+351912345678"].is_test_account is True
    assert by_phone["+351912345678"].password_hash
    assert by_phone["+351924075365"].is_test_account is False


def test_backfill_preserves_non_seed_real_account_password(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    from scripts.backfill_test_accounts import run_backfill

    seeded_test_phone = "+351912345678"
    real_phone = _unique_beta_phone()
    real_hash = hash_password("RealAccountPass1")

    seeded_user = db.execute(
        select(User).where(User.phone == seeded_test_phone)
    ).scalar_one_or_none()
    if seeded_user is None:
        seeded_user = User(
            role=Role.passenger,
            name="Seeded test",
            phone=seeded_test_phone,
            status=UserStatus.active,
        )
        db.add(seeded_user)
    seeded_user.is_test_account = False
    seeded_user.password_hash = hash_password("old-demo-password")

    db.add(
        User(
            role=Role.passenger,
            name="Real",
            phone=real_phone,
            status=UserStatus.active,
            is_test_account=False,
            password_hash=real_hash,
        )
    )
    db.commit()

    result = run_backfill(dry_run=False)

    db.expire_all()
    seeded_user = db.execute(
        select(User).where(User.phone == seeded_test_phone)
    ).scalar_one()
    real_user = db.execute(select(User).where(User.phone == real_phone)).scalar_one()
    assert result["test"] >= 1
    assert seeded_user.is_test_account is True
    assert verify_password(TEST_PWD, seeded_user.password_hash or "")
    assert real_user.is_test_account is False
    assert real_user.password_hash == real_hash


def test_backfill_allows_explicit_extra_test_phone(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    from scripts.backfill_test_accounts import run_backfill

    extra_phone = _unique_beta_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Extra tester",
            phone=extra_phone,
            status=UserStatus.active,
            is_test_account=False,
            password_hash=hash_password("old-extra-password"),
        )
    )
    db.commit()

    run_backfill(dry_run=False, test_phones=[extra_phone])

    db.expire_all()
    extra_user = db.execute(select(User).where(User.phone == extra_phone)).scalar_one()
    assert extra_user.is_test_account is True
    assert verify_password(TEST_PWD, extra_user.password_hash or "")
