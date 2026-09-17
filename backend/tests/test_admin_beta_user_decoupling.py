"""Phase B2: admin user lifecycle independente de BETA_MODE (RBAC intacto)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.user import User
from app.main import app
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

REASON = "motivo operacional suficiente B2"
SUPER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


@pytest.fixture
def as_role():
    """Override get_current_user with the given Role for the duration of a call."""

    def _set(role: Role, user_id: str = ADMIN_ID) -> None:
        async def _ctx() -> UserContext:
            return UserContext(user_id=user_id, role=role)

        app.dependency_overrides[get_current_user] = _ctx

    yield _set
    app.dependency_overrides.pop(get_current_user, None)


def _mk_passenger(db: Session, *, status: UserStatus = UserStatus.active) -> User:
    u = User(
        id=uuid.uuid4(),
        role=Role.passenger,
        name="B2 Target",
        phone=unique_test_phone(),
        status=status,
        requested_role="passenger" if status == UserStatus.pending else None,
        password_hash=hash_password("PassB2xx"),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.mark.parametrize("beta", [True, False])
def test_list_and_pending_users_available(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
    beta: bool,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    pending = _mk_passenger(db, status=UserStatus.pending)
    active = _mk_passenger(db)

    as_role(Role.admin)
    listed = client.get("/admin/users")
    assert listed.status_code == 200, listed.text
    ids = {row["id"] for row in listed.json()}
    assert str(active.id) in ids
    assert str(pending.id) in ids

    pend = client.get("/admin/pending-users")
    assert pend.status_code == 200, pend.text
    phones = {row["phone"] for row in pend.json()}
    assert pending.phone in phones


@pytest.mark.parametrize("beta", [True, False])
def test_block_unblock_update_approve_as_admin(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
    beta: bool,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    u = _mk_passenger(db)
    pending = _mk_passenger(db, status=UserStatus.pending)
    as_role(Role.admin)

    block = client.post(
        f"/admin/users/{u.id}/block", json={"governance_reason": REASON}
    )
    assert block.status_code == 200, block.text

    upd = client.patch(
        f"/admin/users/{u.id}",
        json={"name": "Nome B2"},
    )
    assert upd.status_code == 200, upd.text

    unb = client.post(
        f"/admin/users/{u.id}/unblock", json={"governance_reason": REASON}
    )
    assert unb.status_code == 200, unb.text

    appr = client.post("/admin/approve-user", json={"phone": pending.phone})
    assert appr.status_code == 200, appr.text
    db.refresh(pending)
    assert pending.status == UserStatus.active


@pytest.mark.parametrize("beta", [True, False])
def test_promote_demote_delete_clear_password_bulk_as_super_admin(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
    beta: bool,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    target = _mk_passenger(db)
    other = _mk_passenger(db)
    as_role(Role.super_admin, SUPER_ID)

    promo = client.post(
        f"/admin/users/{target.id}/promote-driver",
        json={"governance_reason": REASON},
    )
    assert promo.status_code == 200, promo.text

    demo = client.post(
        f"/admin/users/{target.id}/demote-driver",
        json={"governance_reason": REASON},
    )
    assert demo.status_code == 200, demo.text

    clear = client.post(
        f"/admin/users/{target.id}/password/clear",
        json={"confirmation": "LIMPAR_SENHA", "governance_reason": REASON},
    )
    assert clear.status_code == 200, clear.text

    bulk = client.post(
        "/admin/users/bulk-block",
        json={
            "user_ids": [str(other.id)],
            "confirmation": "BLOQUEAR_1",
            "governance_reason": REASON,
        },
    )
    assert bulk.status_code == 200, bulk.text

    delete = client.request(
        "DELETE",
        f"/admin/users/{target.id}",
        json={"governance_reason": REASON},
    )
    assert delete.status_code == 200, delete.text
    gone = db.execute(select(User).where(User.id == target.id)).scalar_one_or_none()
    assert gone is None


@pytest.mark.parametrize("role", [Role.passenger, Role.driver, Role.partner])
@pytest.mark.parametrize("beta", [True, False])
def test_user_lifecycle_forbidden_for_non_staff(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
    role: Role,
    beta: bool,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    u = _mk_passenger(db)
    as_role(role)

    assert client.get("/admin/users").status_code == 403
    assert client.get("/admin/pending-users").status_code == 403
    assert (
        client.post(
            f"/admin/users/{u.id}/block", json={"governance_reason": REASON}
        ).status_code
        == 403
    )
    assert client.post("/admin/approve-user", json={"phone": u.phone}).status_code == 403
    assert (
        client.post(
            f"/admin/users/{u.id}/promote-driver",
            json={"governance_reason": REASON},
        ).status_code
        == 403
    )


@pytest.mark.parametrize("beta", [True, False])
def test_plain_admin_cannot_super_admin_only_ops(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    as_role,
    beta: bool,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", beta, raising=False)
    u = _mk_passenger(db)
    as_role(Role.admin)

    assert (
        client.post(
            f"/admin/users/{u.id}/promote-driver",
            json={"governance_reason": REASON},
        ).status_code
        == 403
    )
    assert (
        client.request(
            "DELETE",
            f"/admin/users/{u.id}",
            json={"governance_reason": REASON},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/admin/users/bulk-block",
            json={
                "user_ids": [str(u.id)],
                "confirmation": "BLOQUEAR_1",
                "governance_reason": REASON,
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/admin/users/{u.id}/password/clear",
            json={"confirmation": "LIMPAR_SENHA", "governance_reason": REASON},
        ).status_code
        == 403
    )
