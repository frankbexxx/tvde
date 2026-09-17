"""Phase B4: REQUIRE_PENDING_APPROVAL / ENFORCE_PT_PHONE / ENABLE_DEMO_USERS."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import otp as otp_module
from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

PWD = "demo1234"


def _clear_capability_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", None, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", None, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", None, raising=False)


def test_capability_helpers_inherit_and_override(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_capability_overrides(monkeypatch)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert settings.require_pending_approval() is True
    assert settings.enforce_pt_phone() is True
    assert settings.enable_demo_users() is True

    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.require_pending_approval() is False
    assert settings.enforce_pt_phone() is False
    assert settings.enable_demo_users() is False

    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", True, raising=False)
    assert settings.require_pending_approval() is True
    assert settings.enforce_pt_phone() is True
    assert settings.enable_demo_users() is True


def test_otp_pending_when_flag_true_even_if_beta_false(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)

    phone = unique_test_phone()
    req = client.post("/auth/otp/request", json={"phone": phone})
    assert req.status_code == 200, req.text

    ver = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "100000", "requested_role": "driver"},
    )
    assert ver.status_code == 403
    assert ver.json()["detail"] == "pending_approval"

    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.pending
    assert u.role == Role.passenger
    assert u.requested_role == "driver"


def test_otp_active_when_flag_false(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)

    phone = unique_test_phone()
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    ver = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "100000", "requested_role": "driver"},
    )
    assert ver.status_code == 200, ver.text
    body = ver.json()
    assert body["role"] == "passenger"
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.active
    assert u.requested_role is None


def test_otp_compat_beta_true_unset_flags_pending(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _clear_capability_overrides(monkeypatch)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)

    phone = unique_test_phone()
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    ver = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "100000", "requested_role": "passenger"},
    )
    assert ver.status_code == 403
    assert ver.json()["detail"] == "pending_approval"
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.pending
    assert u.requested_role == "passenger"


def test_demo_login_with_flag_true_beta_false(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    phone = unique_test_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Demo",
            phone=phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(PWD),
        )
    )
    db.commit()
    ok = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert ok.status_code == 200, ok.text


def test_demo_login_blocked_flag_false(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    phone = unique_test_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Demo",
            phone=phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(PWD),
        )
    )
    db.commit()
    r = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert r.status_code == 403
    assert r.json()["detail"] == "test_account_disabled"


def test_real_account_login_independent_of_demo_flag(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", False, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    phone = unique_test_phone()
    db.add(
        User(
            role=Role.driver,
            name="Real",
            phone=phone,
            status=UserStatus.active,
            is_test_account=False,
            password_hash=hash_password(PWD),
        )
    )
    db.commit()
    ok = client.post("/auth/login", json={"phone": phone, "password": PWD})
    assert ok.status_code == 200
    assert ok.json()["role"] == "driver"


def test_max_beta_users_blocks_otp_request_under_pending_policy(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 1, raising=False)

    # One active user fills capacity
    db.add(
        User(
            role=Role.passenger,
            name="Cap",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
    )
    db.commit()

    phone = unique_test_phone()
    r = client.post("/auth/otp/request", json={"phone": phone})
    assert r.status_code == 403
    assert r.json()["detail"] == "BETA cheio"


def test_pilot_target_beta_false_with_explicit_flags(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Future flip profile: BETA=false + pending + demo + PT."""
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "REQUIRE_PENDING_APPROVAL", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEMO_USERS", True, raising=False)
    monkeypatch.setattr(settings, "ENFORCE_PT_PHONE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)

    demo_phone = unique_test_phone()
    db.add(
        User(
            role=Role.passenger,
            name="DemoPilot",
            phone=demo_phone,
            status=UserStatus.active,
            is_test_account=True,
            password_hash=hash_password(PWD),
        )
    )
    db.commit()
    assert (
        client.post(
            "/auth/login", json={"phone": demo_phone, "password": PWD}
        ).status_code
        == 200
    )

    phone = unique_test_phone()
    assert client.post("/auth/otp/request", json={"phone": phone}).status_code == 200
    ver = client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "100000", "requested_role": "driver"},
    )
    assert ver.status_code == 403
    u = db.execute(select(User).where(User.phone == phone)).scalar_one()
    assert u.status == UserStatus.pending
    assert u.requested_role == "driver"
