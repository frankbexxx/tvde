"""Phone == ADMIN_PHONE no longer protects accounts; staff role does."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.auth.passwords import hash_password
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.user import User
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from tests.support.unique_phone import unique_test_phone

REASON = "motivo operacional suficiente phone-guard"
SUPER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PWD = "PassPhoneGuard1"


@pytest.fixture
def as_role():
    def _set(role: Role, user_id: str = ADMIN_ID) -> None:
        async def _ctx() -> UserContext:
            return UserContext(user_id=user_id, role=role)

        app.dependency_overrides[get_current_user] = _ctx

    yield _set
    app.dependency_overrides.pop(get_current_user, None)


def _mk_user(
    db: Session,
    *,
    phone: str,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
) -> User:
    u = User(
        id=uuid.uuid4(),
        role=role,
        name=f"PhoneGuard-{role.value}",
        phone=phone,
        status=status,
        password_hash=hash_password(PWD),
        is_test_account=False,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_admin_phone_passenger_is_administrable(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    target = _mk_user(db, phone=phone, role=Role.passenger)
    as_role(Role.admin)

    upd = client.patch(f"/admin/users/{target.id}", json={"name": "Owner Pax"})
    assert upd.status_code == 200, upd.text

    block = client.post(
        f"/admin/users/{target.id}/block", json={"governance_reason": REASON}
    )
    assert block.status_code == 200, block.text
    db.refresh(target)
    assert target.status == UserStatus.blocked

    unb = client.post(
        f"/admin/users/{target.id}/unblock", json={"governance_reason": REASON}
    )
    assert unb.status_code == 200, unb.text
    db.refresh(target)
    assert target.status == UserStatus.active

    as_role(Role.super_admin, SUPER_ID)
    clear = client.post(
        f"/admin/users/{target.id}/password/clear",
        json={"confirmation": "LIMPAR_SENHA", "governance_reason": REASON},
    )
    assert clear.status_code == 200, clear.text

    promo = client.post(
        f"/admin/users/{target.id}/promote-driver",
        json={"governance_reason": REASON},
    )
    assert promo.status_code == 200, promo.text
    db.refresh(target)
    assert target.role == Role.driver

    demo = client.post(
        f"/admin/users/{target.id}/demote-driver",
        json={"governance_reason": REASON},
    )
    assert demo.status_code == 200, demo.text
    db.refresh(target)
    assert target.role == Role.passenger

    delete = client.request(
        "DELETE",
        f"/admin/users/{target.id}",
        json={"governance_reason": REASON},
    )
    assert delete.status_code == 200, delete.text
    gone = db.execute(select(User).where(User.id == target.id)).scalar_one_or_none()
    assert gone is None


def test_admin_phone_driver_follow_normal_rules(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    target = _mk_user(db, phone=phone, role=Role.driver)
    db.add(
        Driver(
            user_id=target.id,
            partner_id=DEFAULT_PARTNER_UUID,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=False,
        )
    )
    db.commit()

    as_role(Role.super_admin, SUPER_ID)
    demo = client.post(
        f"/admin/users/{target.id}/demote-driver",
        json={"governance_reason": REASON},
    )
    assert demo.status_code == 200, demo.text
    db.refresh(target)
    assert target.role == Role.passenger


def test_admin_phone_staff_still_protected_by_role(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    staff = _mk_user(db, phone=phone, role=Role.super_admin)
    as_role(Role.super_admin, SUPER_ID)

    block = client.post(
        f"/admin/users/{staff.id}/block", json={"governance_reason": REASON}
    )
    assert block.status_code == 400
    assert block.json()["detail"] == "cannot_block_staff_role"

    upd = client.patch(f"/admin/users/{staff.id}", json={"name": "Nope"})
    assert upd.status_code == 400
    assert upd.json()["detail"] == "cannot_modify_staff_role"

    delete = client.request(
        "DELETE",
        f"/admin/users/{staff.id}",
        json={"governance_reason": REASON},
    )
    assert delete.status_code == 400
    assert delete.json()["detail"] == "cannot_delete_staff_role"

    clear = client.post(
        f"/admin/users/{staff.id}/password/clear",
        json={"confirmation": "LIMPAR_SENHA", "governance_reason": REASON},
    )
    assert clear.status_code == 400
    assert clear.json()["detail"] == "cannot_modify_staff_role"

    db.refresh(staff)
    assert staff.role == Role.super_admin
    assert staff.status == UserStatus.active


def test_bulk_block_admin_phone_passenger_not_skipped_for_phone(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
) -> None:
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    pax = _mk_user(db, phone=phone, role=Role.passenger)
    staff = _mk_user(db, phone=unique_test_phone(), role=Role.admin)
    as_role(Role.super_admin, SUPER_ID)

    bulk = client.post(
        "/admin/users/bulk-block",
        json={
            "user_ids": [str(pax.id), str(staff.id)],
            "confirmation": "BLOQUEAR_2",
            "governance_reason": REASON,
        },
    )
    assert bulk.status_code == 200, bulk.text
    body = bulk.json()
    assert body["blocked_count"] == 1
    assert body["skipped_count"] == 1
    db.refresh(pax)
    db.refresh(staff)
    assert pax.status == UserStatus.blocked
    assert staff.status == UserStatus.active


def test_downgrade_scenario_passenger_with_admin_phone(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
) -> None:
    """After #630-style DB downgrade, ADMIN_PHONE passenger follows normal policy."""
    phone = unique_test_phone()
    monkeypatch.setattr(settings, "ADMIN_PHONE", phone, raising=False)
    target = _mk_user(db, phone=phone, role=Role.passenger)
    as_role(Role.admin)

    block = client.post(
        f"/admin/users/{target.id}/block", json={"governance_reason": REASON}
    )
    assert block.status_code == 200, block.text
    db.refresh(target)
    assert target.role == Role.passenger
    assert target.status == UserStatus.blocked
