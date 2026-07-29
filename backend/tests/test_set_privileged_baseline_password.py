"""Unit tests for privileged baseline password ops script."""

from __future__ import annotations

import importlib.util
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy.orm import Session

from app.auth.passwords import MIN_PASSWORD_LEN, verify_password
from app.db.models.user import User
from app.models.enums import Role, UserStatus

_SCRIPT = (
    Path(__file__).resolve().parent.parent
    / "scripts"
    / "set_privileged_baseline_password.py"
)


def _load_script():
    name = f"set_privileged_baseline_password_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(name, _SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def script():
    return _load_script()


def test_phone_outside_allowlist_aborts(script) -> None:
    with pytest.raises(script.Abort, match="allowlist"):
        script.expected_role_for_phone("+351911111111")


def test_frank_phone_aborts(script) -> None:
    with pytest.raises(script.Abort, match="Frank"):
        script.expected_role_for_phone(script.FRANK_PHONE)


def test_super_admin_user_aborts(script) -> None:
    user = SimpleNamespace(
        phone="+351900000000",
        role=Role.super_admin,
        password_hash=None,
        is_test_account=False,
    )
    with pytest.raises(script.Abort, match="super_admin"):
        script.apply_privileged_password(
            user,
            phone="+351900000000",
            password="OwnPass12",
            demo_password="demo1234",
        )


def test_role_mismatch_aborts(script) -> None:
    user = SimpleNamespace(
        phone="+351900000000",
        role=Role.partner,
        password_hash=None,
        is_test_account=False,
    )
    with pytest.raises(script.Abort, match="role mismatch"):
        script.apply_privileged_password(
            user,
            phone="+351900000000",
            password="OwnPass12",
            demo_password="demo1234",
        )


def test_demo_password_aborts(script) -> None:
    user = SimpleNamespace(
        phone="+351900000000",
        role=Role.admin,
        password_hash=None,
        is_test_account=False,
    )
    with pytest.raises(script.Abort, match="TEST_ACCOUNT_PASSWORD"):
        script.apply_privileged_password(
            user,
            phone="+351900000000",
            password="demo1234",
            demo_password="demo1234",
        )


def test_short_password_aborts(script) -> None:
    user = SimpleNamespace(
        phone="+351955555502",
        role=Role.partner,
        password_hash=None,
        is_test_account=False,
    )
    short = "x" * (MIN_PASSWORD_LEN - 1)
    with pytest.raises(script.Abort, match="mínimo"):
        script.apply_privileged_password(
            user,
            phone="+351955555502",
            password=short,
            demo_password="demo1234",
        )


def test_happy_path_sets_hash_and_not_test(script, db: Session) -> None:
    phone = "+351900000000"
    # Isolate from any leftover baseline row in the shared test DB.
    existing = db.query(User).filter(User.phone == phone).one_or_none()
    if existing is not None:
        db.delete(existing)
        db.commit()

    user = User(
        role=Role.admin,
        name="dev_admin",
        phone=phone,
        status=UserStatus.active,
        is_test_account=True,
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    own = "OwnAdminPass1"
    result = script.apply_privileged_password(
        user,
        phone=phone,
        password=own,
        demo_password="demo1234",
    )
    db.commit()
    db.refresh(user)

    assert result["phone"] == phone
    assert result["role"] == "admin"
    assert result["is_test_account"] is False
    assert result["password_set"] is True
    assert user.is_test_account is False
    assert user.password_hash is not None
    assert verify_password(own, user.password_hash)
    assert not verify_password("demo1234", user.password_hash)
