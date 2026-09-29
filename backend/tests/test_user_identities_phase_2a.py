"""Phase II-A: mirror legacy login into user_identities without changing auth."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.auth.security import decode_access_token
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.db.session import engine
from app.models.enums import Role, UserStatus
from app.services.user_identities import (
    IdentityBackfillAborted,
    IdentityMirrorConflict,
    backfill_user_identities,
    count_active_identities,
    mirror_legacy_login,
)
from tests.support.unique_phone import unique_test_phone
from tests.test_google_passenger_onboarding import (
    _claims,
    _complete,
    _ids,
    _link,
    _login,
    _patch_claims,
)


def _add_user(
    db: Session,
    *,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
    email: str | None = None,
    sub: str | None = None,
) -> User:
    user = User(
        role=role,
        name="Mirror",
        phone=unique_test_phone(),
        status=status,
        email=email,
        oauth_google_sub=sub,
        password_hash=hash_password("mirror-password-1"),
        requested_role="passenger" if status == UserStatus.pending else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _delete_user(db: Session, user_id: uuid.UUID) -> None:
    db.rollback()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})


def _rows(db: Session, user_id: uuid.UUID) -> list[UserIdentity]:
    return list(
        db.execute(select(UserIdentity).where(UserIdentity.user_id == user_id)).scalars()
    )


def test_sync_copies_legacy_and_is_idempotent(db: Session) -> None:
    email = f"sync-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(db, email=email, sub=sub)
    user_id = user.id
    try:
        before = db.execute(select(func.count()).select_from(User)).scalar_one()
        backfill_user_identities(db.connection())
        db.commit()
        backfill_user_identities(db.connection())
        db.commit()
        rows = _rows(db, user_id)
        assert len(rows) == 1
        assert rows[0].provider == "google"
        assert rows[0].email == email
        assert rows[0].provider_subject == sub
        assert rows[0].is_primary is True
        assert rows[0].is_verified is True
        assert rows[0].revoked_at is None
        assert count_active_identities(db, user_id) == 1
        assert db.get(User, user_id) is not None
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == before
    finally:
        _delete_user(db, user_id)


def test_email_only_then_sub_promotes_the_same_row(db: Session) -> None:
    email = f"promote-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(db, email=email)
    user_id = user.id
    try:
        mirror_legacy_login(db, user)
        db.commit()
        original = _rows(db, user_id)[0]
        original_id = original.id
        assert original.provider == "email"
        assert original.provider_subject is None
        user.oauth_google_sub = sub
        mirror_legacy_login(db, user)
        db.commit()
        rows = _rows(db, user_id)
        assert len(rows) == 1
        assert rows[0].id == original_id
        assert rows[0].provider == "google"
        assert rows[0].provider_subject == sub
        assert rows[0].email == email
        assert rows[0].is_primary is True
        assert count_active_identities(db, user_id) == 1
    finally:
        _delete_user(db, user_id)


def test_same_email_or_sub_on_another_user_fails(db: Session) -> None:
    email = f"taken-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    owner = _add_user(db, email=email, sub=sub)
    other = _add_user(db, email=f"other-{uuid.uuid4().hex}@example.com")
    owner_id = owner.id
    other_id = other.id
    try:
        mirror_legacy_login(db, owner)
        db.commit()
        other.email = email
        with pytest.raises(IdentityMirrorConflict, match="email_owned_by_other"):
            mirror_legacy_login(db, other)
        db.rollback()
        other = db.get(User, other_id)
        assert other is not None
        other.email = f"free-{uuid.uuid4().hex}@example.com"
        other.oauth_google_sub = sub
        with pytest.raises(IdentityMirrorConflict, match="subject_owned_by_other"):
            mirror_legacy_login(db, other)
        db.rollback()
        assert db.get(User, owner_id) is not None
        assert db.get(User, other_id) is not None
    finally:
        _delete_user(db, other_id)
        _delete_user(db, owner_id)


def test_revoked_email_and_sub_stay_reserved(db: Session) -> None:
    email = f"revoked-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    owner = _add_user(db, email=email, sub=sub)
    other = _add_user(db)
    owner_id = owner.id
    other_id = other.id
    try:
        mirror_legacy_login(db, owner)
        db.commit()
        row = _rows(db, owner_id)[0]
        row.is_primary = False
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        other.email = email
        with pytest.raises(IdentityMirrorConflict, match="email_owned_by_other"):
            mirror_legacy_login(db, other)
        db.rollback()
        other = db.get(User, other_id)
        assert other is not None
        other.oauth_google_sub = sub
        with pytest.raises(IdentityMirrorConflict, match="subject_owned_by_other"):
            mirror_legacy_login(db, other)
        db.rollback()
        owner = db.get(User, owner_id)
        other = db.get(User, other_id)
        assert owner is not None and other is not None
        owner.email = None
        owner.oauth_google_sub = None
        db.commit()
        other.email = email
        other.oauth_google_sub = sub
        db.commit()
        with pytest.raises(IdentityBackfillAborted, match="legacy_sub_owned_by_other") as raised:
            backfill_user_identities(db.connection())
        assert email not in str(raised.value)
        assert sub not in str(raised.value)
        db.rollback()
    finally:
        _delete_user(db, other_id)
        _delete_user(db, owner_id)


def test_incompatible_legacy_aborts_without_rewriting_ownership(db: Session) -> None:
    email = f"split-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(db, email=email, sub=sub)
    user_id = user.id
    try:
        mirror_legacy_login(db, user)
        db.commit()
        identity_id = _rows(db, user_id)[0].id
        user.oauth_google_sub = f"sub-{uuid.uuid4().hex}"
        db.commit()
        with pytest.raises(IdentityBackfillAborted, match="incompatible_google_subject") as raised:
            backfill_user_identities(db.connection())
        assert email not in str(raised.value)
        assert sub not in str(raised.value)
        db.rollback()
        kept = db.get(UserIdentity, identity_id)
        assert kept is not None
        assert kept.user_id == user_id
        assert kept.provider_subject == sub
        assert email not in str(IdentityBackfillAborted)
    finally:
        _delete_user(db, user_id)


def test_second_active_primary_still_fails(db: Session) -> None:
    user = _add_user(db, email=f"primary-{uuid.uuid4().hex}@example.com")
    user_id = user.id
    try:
        mirror_legacy_login(db, user)
        db.commit()
        db.add(
            UserIdentity(
                user_id=user_id,
                provider="email",
                email=f"second-{uuid.uuid4().hex}@example.com",
                is_primary=True,
                is_verified=True,
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        assert count_active_identities(db, user_id) == 1
    finally:
        _delete_user(db, user_id)


def test_separate_accounts_keep_their_own_identities(db: Session) -> None:
    partial = _add_user(
        db,
        status=UserStatus.pending,
        email=f"partial-{uuid.uuid4().hex}@example.com",
        sub=f"sub-{uuid.uuid4().hex}",
    )
    staff = _add_user(
        db,
        role=Role.super_admin,
        email=f"staff-{uuid.uuid4().hex}@example.com",
        sub=f"sub-{uuid.uuid4().hex}",
    )
    partial_id = partial.id
    staff_id = staff.id
    try:
        backfill_user_identities(db.connection())
        db.commit()
        partial_rows = _rows(db, partial_id)
        staff_rows = _rows(db, staff_id)
        assert len(partial_rows) == 1
        assert len(staff_rows) == 1
        assert partial_rows[0].user_id == partial_id
        assert staff_rows[0].user_id == staff_id
        assert partial_rows[0].provider_subject != staff_rows[0].provider_subject
        assert db.get(User, partial_id) is not None
        assert db.get(User, staff_id) is not None
        assert db.get(User, partial_id).status == UserStatus.pending
        assert db.get(User, staff_id).role == Role.super_admin
    finally:
        _delete_user(db, partial_id)
        _delete_user(db, staff_id)


def test_google_login_still_uses_legacy_column(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _add_user(db, email=email, sub=sub)
    user_id = user.id
    try:
        _patch_claims(monkeypatch, _claims(sub, email))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 200, logged.text
        body = logged.json()
        payload = decode_access_token(body["access_token"])
        assert payload["sub"] == str(user_id)
        assert payload["role"] == "passenger"
        assert "token_version" in payload
        assert "purpose" not in payload
        assert set(payload) == {"sub", "role", "iat", "exp", "token_version"}
        db.expire_all()
        assert db.get(User, user_id).oauth_google_sub == sub
    finally:
        _delete_user(db, user_id)


def test_login_succeeds_when_the_mirror_row_is_missing(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _add_user(db, email=email, sub=sub)
    user_id = user.id
    phone = user.phone
    try:
        _patch_claims(monkeypatch, _claims(sub, email))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 200, logged.text
        password_login = client.post(
            "/auth/login",
            json={"phone": phone, "password": "mirror-password-1"},
        )
        assert password_login.status_code == 200, password_login.text
        assert password_login.json()["user_id"] == str(user_id)
    finally:
        _delete_user(db, user_id)


def test_new_google_onboarding_mirrors_and_keeps_the_same_user(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    _patch_claims(monkeypatch, _claims(sub, email, name="Nova Conta"))
    started = _login(client, sub=sub, email=email)
    assert started.status_code == 403, started.text
    assert started.json()["detail"]["code"] == "google_onboarding_required"
    pending = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    pending_id = pending.id
    try:
        mirrored = _rows(db, pending_id)
        assert len(mirrored) == 1
        assert mirrored[0].provider == "google"
        assert mirrored[0].is_primary is True
        finished = _complete(client, phone=phone)
        assert finished.status_code == 200, finished.text
        token = decode_access_token(finished.json()["access_token"])
        assert token["sub"] == str(pending_id)
        assert token["role"] == "passenger"
        assert "purpose" not in token
        db.expire_all()
        done = db.get(User, pending_id)
        assert done is not None
        assert done.status == UserStatus.active
        assert done.phone == phone
        assert done.role == Role.passenger
        assert len(_rows(db, pending_id)) == 1
    finally:
        _delete_user(db, pending_id)


def test_link_moves_legacy_sub_and_does_not_remove_the_existing_account(
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
    pending = db.execute(select(User).where(User.oauth_google_sub == sub)).scalar_one()
    pending_id = pending.id
    linked = _link(client, phone=phone, password="staff-password-1")
    assert linked.status_code == 200, linked.text
    assert linked.json()["role"] == "super_admin"
    assert linked.json()["user_id"] == str(staff_id)
    db.expire_all()
    assert db.get(User, pending_id) is None
    staff = db.get(User, staff_id)
    assert staff is not None
    assert staff.oauth_google_sub == sub
    assert staff.email == email
    assert staff.role == Role.super_admin
    rows = _rows(db, staff_id)
    assert len(rows) == 1
    assert rows[0].provider == "google"
    assert rows[0].provider_subject == sub
    assert rows[0].user_id == staff_id
    _delete_user(db, staff_id)


def test_autolink_promotes_the_existing_email_row(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _add_user(db, role=Role.driver, email=email)
    user_id = user.id
    mirror_legacy_login(db, user)
    db.commit()
    identity_id = _rows(db, user_id)[0].id
    try:
        _patch_claims(monkeypatch, _claims(sub, email, name="Conta"))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 200, logged.text
        assert logged.json()["role"] == "driver"
        assert logged.json()["user_id"] == str(user_id)
        db.expire_all()
        rows = _rows(db, user_id)
        assert len(rows) == 1
        assert rows[0].id == identity_id
        assert rows[0].provider == "google"
        assert rows[0].provider_subject == sub
        assert rows[0].is_primary is True
        assert db.get(User, user_id).oauth_google_sub == sub
    finally:
        _delete_user(db, user_id)


def test_privileged_link_mirrors_without_a_second_row(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    staff = User(
        role=Role.admin,
        name="Staff",
        phone=phone,
        email=email,
        status=UserStatus.active,
        password_hash=hash_password("staff-password-1"),
    )
    db.add(staff)
    db.commit()
    staff_id = staff.id
    mirror_legacy_login(db, staff)
    db.commit()
    identity_id = _rows(db, staff_id)[0].id
    try:
        _patch_claims(monkeypatch, _claims(sub, email, name="Staff"))
        refused = _login(client, sub=sub, email=email)
        assert refused.status_code == 409
        assert refused.json()["detail"] == {
            "code": "existing_account_link_required",
            "proof": "password",
        }
        linked = _link(client, phone=phone, password="staff-password-1")
        assert linked.status_code == 200, linked.text
        db.expire_all()
        rows = _rows(db, staff_id)
        assert len(rows) == 1
        assert rows[0].id == identity_id
        assert rows[0].provider == "google"
        assert rows[0].provider_subject == sub
        assert db.get(User, staff_id).role == Role.admin
    finally:
        _delete_user(db, staff_id)
