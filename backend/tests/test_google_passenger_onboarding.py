"""Google passenger onboarding: pending without a session, then active."""

from __future__ import annotations

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.api.deps import UserContext, get_current_user
from app.api.routers import auth as auth_module
from app.core.config import settings
from app.db.models.user import User
from app.db.models.user_legal_acceptance import LegalAcceptanceSource, UserLegalAcceptance
from app.main import app
from app.models.enums import Role, UserStatus
from app.services.legal_acceptance import record_acceptance
from tests.support.unique_phone import unique_test_phone

RAW_NONCE = "0123456789abcdef0123456789abcdef"
HASHED_NONCE = hashlib.sha256(RAW_NONCE.encode("utf-8")).hexdigest()


def _ids() -> tuple[str, str]:
    token = unique_test_phone()[1:]
    return f"sub-{token}", f"g-{token}@example.com"


def _patch_claims(monkeypatch: pytest.MonkeyPatch, claims: dict) -> None:
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 1_000_000, raising=False)
    monkeypatch.setattr(auth_module, "verify_id_token_claims", lambda _token: claims)


def _claims(sub: str, email: str, *, name: str = "Nova Conta", nonce: str | None = HASHED_NONCE) -> dict:
    body: dict = {
        "sub": sub,
        "email": email,
        "email_verified": True,
        "name": name,
    }
    if nonce is not None:
        body["nonce"] = nonce
    return body


def _login(client: TestClient, *, sub: str, email: str, name: str = "Nova Conta") -> object:
    return client.post(
        "/auth/google/id-token",
        json={
            "id_token": "header.payload.signature-not-logged",
            "nonce": RAW_NONCE,
            "requested_role": "passenger",
        },
    )


def _complete(
    client: TestClient,
    *,
    name: str = "Nome Confirmado",
    phone: str | None = None,
    accept_legal: bool = True,
    nonce: str | None = RAW_NONCE,
    sub_claims: dict | None = None,
) -> object:
    body: dict = {
        "id_token": "header.payload.signature-not-logged",
        "name": name,
        "phone": phone or unique_test_phone(),
        "accept_legal": accept_legal,
    }
    if nonce is not None:
        body["nonce"] = nonce
    return client.post("/auth/google/onboarding", json=body)


@pytest.fixture
def as_admin():
    async def _ctx() -> UserContext:
        return UserContext(user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", role=Role.admin)

    app.dependency_overrides[get_current_user] = _ctx
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_new_google_passenger_is_pending_without_session_or_acceptance(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    _patch_claims(monkeypatch, _claims(sub, email))
    created = _login(client, sub=sub, email=email)
    assert created.status_code == 403
    detail = created.json()["detail"]
    assert detail["code"] == "google_onboarding_required"
    assert detail["name"] == "Nova Conta"
    assert detail["email"] == email
    assert "id_token" not in detail
    assert "access_token" not in created.json()
    assert "header.payload" not in created.text

    db.expire_all()
    user = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    assert user.role == Role.passenger
    assert user.status == UserStatus.pending
    assert user.requested_role == "passenger"
    assert user.phone.startswith("g")
    assert user.email == email
    count = db.execute(
        select(func.count()).select_from(UserLegalAcceptance).where(UserLegalAcceptance.user_id == user.id)
    ).scalar_one()
    assert count == 0


def test_complete_onboarding_activates_and_records_acceptance(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    _patch_claims(monkeypatch, _claims(sub, email, name="Ana"))
    assert _login(client, sub=sub, email=email).status_code == 403
    db.expire_all()
    user = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    record_acceptance(db, user.id, LegalAcceptanceSource.register_google)
    db.commit()
    synthetic = user.phone
    phone = unique_test_phone()

    done = _complete(client, name="  Ana Confirmada  ", phone=phone)
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["access_token"]
    assert body["role"] == "passenger"
    assert "header.payload" not in done.text

    db.expire_all()
    db.refresh(user)
    assert user.status == UserStatus.active
    assert user.requested_role is None
    assert user.name == "Ana Confirmada"
    assert user.phone == phone
    assert user.phone != synthetic
    rows = db.execute(
        select(UserLegalAcceptance)
        .where(UserLegalAcceptance.user_id == user.id)
        .order_by(UserLegalAcceptance.accepted_at.asc())
    ).scalars().all()
    assert len(rows) == 2
    assert rows[-1].source == LegalAcceptanceSource.register_google.value

    again = _login(client, sub=sub, email=email)
    assert again.status_code == 200, again.text
    assert again.json()["access_token"]


def test_existing_pending_google_passenger_can_finish(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = User(
        role=Role.passenger,
        name="Smoke",
        phone=f"g{sub[:31]}",
        email=email,
        oauth_google_sub=sub,
        status=UserStatus.pending,
        requested_role="passenger",
    )
    db.add(user)
    db.commit()
    _patch_claims(monkeypatch, _claims(sub, email, name="Smoke"))
    started = _login(client, sub=sub, email=email)
    assert started.status_code == 403
    assert started.json()["detail"]["code"] == "google_onboarding_required"
    phone = unique_test_phone()
    done = _complete(client, name="Smoke", phone=f"351{phone[4:]}")
    assert done.status_code == 200, done.text
    db.refresh(user)
    assert user.status == UserStatus.active
    assert user.phone == phone


def test_onboarding_rejects_duplicate_phone_invalid_name_and_missing_acceptance(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    _patch_claims(monkeypatch, _claims(sub, email))
    assert _login(client, sub=sub, email=email).status_code == 403
    taken = unique_test_phone()
    db.add(
        User(
            role=Role.passenger,
            name="Outra",
            phone=taken,
            status=UserStatus.active,
        )
    )
    db.commit()

    missing = _complete(client, accept_legal=False, phone=unique_test_phone())
    assert missing.status_code == 400
    assert missing.json()["detail"] == "legal_acceptance_required"

    blank = _complete(client, name="   ", phone=unique_test_phone())
    assert blank.status_code == 400
    assert blank.json()["detail"] == "invalid_name"

    bad_phone = _complete(client, phone="+441234567890")
    assert bad_phone.status_code == 400
    assert bad_phone.json()["detail"] == "invalid_phone_format"

    clash = _complete(client, phone=taken)
    assert clash.status_code == 409
    assert clash.json()["detail"]["code"] == "existing_account_link_conflict"
    assert "proof" not in clash.json()["detail"]
    assert "Outra" not in clash.text
    assert "admin" not in clash.text.lower()
    assert "super_admin" not in clash.text

    db.expire_all()
    user = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    assert user.status == UserStatus.pending
    assert user.phone.startswith("g")


def test_onboarding_rejects_invalid_token_other_sub_blocked_and_non_google_pending(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    other_sub, other_email = _ids()
    pending_phone = unique_test_phone()
    otp_user = User(
        role=Role.passenger,
        name="OTP",
        phone=pending_phone,
        email=email,
        status=UserStatus.pending,
        requested_role="passenger",
    )
    blocked = User(
        role=Role.passenger,
        name="Blocked",
        phone=unique_test_phone(),
        email=other_email,
        oauth_google_sub=other_sub,
        status=UserStatus.blocked,
        requested_role="passenger",
    )
    driver = User(
        role=Role.passenger,
        name="Driver",
        phone=unique_test_phone(),
        status=UserStatus.pending,
        requested_role="driver",
    )
    db.add_all([otp_user, blocked, driver])
    db.commit()

    def _boom(_token: str) -> dict:
        raise RuntimeError("google_invalid_token")

    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    monkeypatch.setattr(auth_module, "verify_id_token_claims", _boom)
    invalid = _complete(client)
    assert invalid.status_code == 400
    assert invalid.json()["detail"] == "google_token_invalid"

    _patch_claims(monkeypatch, _claims(sub, "fresh@example.com"))
    missing_user = _complete(client, phone=unique_test_phone())
    assert missing_user.status_code == 404
    assert missing_user.json()["detail"] == "google_onboarding_not_found"

    _patch_claims(monkeypatch, _claims(sub, email))
    hijack = _login(client, sub=sub, email=email)
    assert hijack.status_code == 403
    assert hijack.json()["detail"] == "pending_approval"
    db.expire_all()
    db.refresh(otp_user)
    assert otp_user.oauth_google_sub is None
    assert otp_user.status == UserStatus.pending

    _patch_claims(monkeypatch, _claims(other_sub, other_email))
    blocked_login = _login(client, sub=other_sub, email=other_email)
    assert blocked_login.status_code == 403
    assert blocked_login.json()["detail"] == "blocked"
    blocked_done = _complete(client, phone=unique_test_phone())
    assert blocked_done.status_code == 403
    assert blocked_done.json()["detail"] == "blocked"
    db.refresh(blocked)
    assert blocked.status == UserStatus.blocked

    db.refresh(driver)
    assert driver.status == UserStatus.pending
    assert driver.requested_role == "driver"


def test_active_google_passenger_logs_in_without_onboarding(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = User(
        role=Role.passenger,
        name="Activa",
        phone=unique_test_phone(),
        email=email,
        oauth_google_sub=sub,
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    _patch_claims(monkeypatch, _claims(sub, email, name="Activa"))
    res = _login(client, sub=sub, email=email)
    assert res.status_code == 200, res.text
    assert res.json()["access_token"]
    db.refresh(user)
    assert user.status == UserStatus.active


def test_admin_queue_hides_google_onboarding_and_keeps_drivers(
    client: TestClient, db: Session, as_admin: None
) -> None:
    sub, email = _ids()
    google_user = User(
        role=Role.passenger,
        name="Google",
        phone=f"g{sub[:31]}",
        email=email,
        oauth_google_sub=sub,
        status=UserStatus.pending,
        requested_role="passenger",
    )
    driver = User(
        role=Role.passenger,
        name="Driver",
        phone=unique_test_phone(),
        status=UserStatus.pending,
        requested_role="driver",
    )
    otp = User(
        role=Role.passenger,
        name="OTP",
        phone=unique_test_phone(),
        status=UserStatus.pending,
        requested_role="passenger",
    )
    db.add_all([google_user, driver, otp])
    db.commit()

    listed = client.get("/admin/pending-users")
    assert listed.status_code == 200, listed.text
    phones = {row["phone"] for row in listed.json()}
    assert google_user.phone not in phones
    assert driver.phone in phones
    assert otp.phone in phones

    approved = client.post("/admin/approve-user", json={"phone": google_user.phone})
    assert approved.status_code == 400
    assert approved.json()["detail"] == "google_onboarding_not_admin_approvable"
    db.refresh(google_user)
    assert google_user.status == UserStatus.pending


def _link(client: TestClient, *, phone: str, password: str, accept_legal: bool = True) -> object:
    return client.post(
        "/auth/google/link",
        json={
            "id_token": "header.payload.signature-not-logged",
            "nonce": RAW_NONCE,
            "phone": phone,
            "password": password,
            "accept_legal": accept_legal,
        },
    )


@pytest.mark.parametrize("role", [Role.admin, Role.super_admin])
def test_privileged_email_match_requires_password_before_link(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, role: Role
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    staff = User(
        role=role,
        name="Staff",
        phone=phone,
        email=email,
        status=UserStatus.active,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(staff)
    db.commit()
    staff_id = staff.id
    _patch_claims(monkeypatch, _claims(sub, email, name="Staff"))
    logged = _login(client, sub=sub, email=email)
    assert logged.status_code == 409, logged.text
    detail = logged.json()["detail"]
    assert detail == {"code": "existing_account_link_required", "proof": "password"}
    assert "access_token" not in logged.text
    assert email not in logged.text
    assert "super_admin" not in logged.text
    assert "admin" not in logged.text
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.oauth_google_sub is None
    assert staff.role == role
    assert staff.phone == phone
    assert db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one_or_none() is None

    wrong = _link(client, phone=phone, password="not-the-password")
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "invalid_credentials"
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.oauth_google_sub is None
    assert staff.role == role

    linked = _link(client, phone=phone, password="staff-password-1")
    assert linked.status_code == 200, linked.text
    assert linked.json()["role"] == role.value
    assert linked.json()["access_token"]
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.role == role
    assert staff.phone == phone
    assert staff.email == email
    assert staff.oauth_google_sub == sub
    holders = db.execute(select(User).where(User.oauth_google_sub == sub)).scalars().all()
    assert [row.id for row in holders] == [staff.id]

    again = _login(client, sub=sub, email=email)
    assert again.status_code == 200, again.text
    assert again.json()["role"] == role.value
    assert again.json()["access_token"]


@pytest.mark.parametrize("role", [Role.passenger, Role.driver, Role.partner])
def test_verified_email_still_autolinks_non_privileged_roles(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, role: Role
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    user = User(
        role=role,
        name="Conta",
        phone=phone,
        email=email,
        status=UserStatus.active,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(user)
    db.commit()
    user_id = user.id
    _patch_claims(monkeypatch, _claims(sub, email, name="Conta"))
    logged = _login(client, sub=sub, email=email)
    assert logged.status_code == 200, logged.text
    assert logged.json()["role"] == role.value
    assert logged.json()["access_token"]
    db.expire_all()
    rows = db.execute(select(User).where(User.email == email)).scalars().all()
    assert len(rows) == 1
    assert rows[0].id == user_id
    assert rows[0].role == role
    assert rows[0].phone == phone
    assert rows[0].oauth_google_sub == sub


def test_blocked_or_demo_privileged_email_is_not_linked(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    blocked = User(
        role=Role.admin,
        name="Blocked",
        phone=unique_test_phone(),
        email=email,
        status=UserStatus.blocked,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(blocked)
    db.commit()
    blocked_id = blocked.id
    _patch_claims(monkeypatch, _claims(sub, email))
    refused = _login(client, sub=sub, email=email)
    assert refused.status_code == 403
    assert refused.json()["detail"] == "blocked"
    db.expire_all()
    blocked = db.get(User, blocked_id)
    assert blocked is not None
    assert blocked.oauth_google_sub is None

    demo_sub, demo_email = _ids()
    demo = User(
        role=Role.super_admin,
        name="Demo",
        phone=unique_test_phone(),
        email=demo_email,
        status=UserStatus.active,
        is_test_account=True,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(demo)
    db.commit()
    demo_id = demo.id
    _patch_claims(monkeypatch, _claims(demo_sub, demo_email))
    clash = _login(client, sub=demo_sub, email=demo_email)
    assert clash.status_code == 409
    assert clash.json()["detail"] == {"code": "existing_account_link_conflict"}
    forced = _link(client, phone=demo.phone, password="staff-password-1")
    assert forced.status_code == 409
    assert forced.json()["detail"]["code"] == "existing_account_link_conflict"
    db.expire_all()
    demo = db.get(User, demo_id)
    assert demo is not None
    assert demo.oauth_google_sub is None
    assert demo.role == Role.super_admin


def test_existing_phone_links_with_password_and_keeps_role(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    staff = User(
        role=Role.super_admin,
        name="Staff",
        phone=phone,
        status=UserStatus.active,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(staff)
    db.commit()
    staff_id = staff.id
    _patch_claims(monkeypatch, _claims(sub, email))
    assert _login(client, sub=sub, email=email).status_code == 403

    clash = _complete(client, phone=phone)
    assert clash.status_code == 409
    detail = clash.json()["detail"]
    assert detail == {"code": "existing_account_link_required", "proof": "password"}
    assert "super_admin" not in clash.text
    assert email not in clash.text

    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.role == Role.super_admin
    assert staff.oauth_google_sub is None
    pending = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    assert pending.status == UserStatus.pending
    assert pending.phone != phone

    wrong = _link(client, phone=phone, password="not-the-password")
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "invalid_credentials"
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.oauth_google_sub is None
    assert staff.role == Role.super_admin

    linked = _link(client, phone=phone, password="staff-password-1")
    assert linked.status_code == 200, linked.text
    assert linked.json()["role"] == "super_admin"
    assert linked.json()["access_token"]
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.role == Role.super_admin
    assert staff.phone == phone
    assert staff.email == email
    assert staff.oauth_google_sub == sub
    holders = db.execute(select(User).where(User.oauth_google_sub == sub)).scalars().all()
    assert [row.id for row in holders] == [staff.id]
    again = _login(client, sub=sub, email=email)
    assert again.status_code == 200, again.text
    assert again.json()["role"] == "super_admin"


def test_conflicting_email_or_sub_is_not_merged(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    other_sub, other_email = _ids()
    phone = unique_test_phone()
    staff = User(
        role=Role.admin,
        name="Staff",
        phone=phone,
        email=other_email,
        status=UserStatus.active,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(staff)
    db.commit()
    staff_id = staff.id
    _patch_claims(monkeypatch, _claims(sub, email))
    assert _login(client, sub=sub, email=email).status_code == 403
    clash = _complete(client, phone=phone)
    assert clash.status_code == 409
    assert clash.json()["detail"] == {"code": "existing_account_link_conflict"}
    forced = _link(client, phone=phone, password="staff-password-1")
    assert forced.status_code == 409
    assert forced.json()["detail"]["code"] == "existing_account_link_conflict"
    db.expire_all()
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.role == Role.admin
    assert staff.email == other_email
    assert staff.oauth_google_sub is None
    pending = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    assert pending.id != staff.id
    assert pending.phone != phone

    taken_sub_phone = unique_test_phone()
    occupied = User(
        role=Role.driver,
        name="Driver",
        phone=taken_sub_phone,
        status=UserStatus.active,
        oauth_google_sub=other_sub,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(occupied)
    db.commit()
    occupied_id = occupied.id
    sub_clash = _complete(client, phone=taken_sub_phone)
    assert sub_clash.status_code == 409
    assert sub_clash.json()["detail"]["code"] == "existing_account_link_conflict"
    db.expire_all()
    occupied = db.get(User, occupied_id)
    assert occupied is not None
    assert occupied.oauth_google_sub == other_sub
    assert occupied.role == Role.driver
