"""Phase II-B: Google auth reads user_identities. No auto-link and no user delete."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.auth.security import (
    create_strong_auth_proof,
    decode_access_token,
    verify_strong_auth_proof,
)
from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.db.session import engine
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone
from tests.test_google_passenger_onboarding import (
    _claims,
    _complete,
    _google_identity,
    _ids,
    _link,
    _login,
    _patch_claims,
)


def _user(
    db: Session,
    *,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
    email: str | None = None,
    password: str | None = "account-password-1",
    phone: str | None = None,
) -> User:
    user = User(
        role=role,
        name="Conta",
        phone=phone or unique_test_phone(),
        email=email,
        status=status,
        password_hash=hash_password(password) if password else None,
        requested_role="passenger" if status == UserStatus.pending else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _identity(
    db: Session,
    user: User,
    *,
    provider: str,
    email: str | None,
    subject: str | None = None,
    primary: bool = False,
    revoked: bool = False,
) -> UserIdentity:
    row = UserIdentity(
        user_id=user.id,
        provider=provider,
        email=email,
        provider_subject=subject,
        is_primary=primary,
        is_verified=True,
        revoked_at=datetime.now(timezone.utc) if revoked else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _delete(db: Session, user_id: uuid.UUID) -> None:
    db.rollback()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})


def test_revoked_google_is_not_a_new_account(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email=email)
    user_id = user.id
    try:
        _identity(db, user, provider="google", email=email, subject=sub, revoked=True)
        before = db.execute(select(func.count()).select_from(User)).scalar_one()
        _patch_claims(monkeypatch, _claims(sub, email))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 403
        assert logged.json()["detail"] == "identity_revoked"
        db.expire_all()
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == before
        assert db.get(User, user_id) is not None
    finally:
        _delete(db, user_id)


def test_other_pending_is_not_google_onboarding(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, status=UserStatus.pending, email=email)
    user.requested_role = "driver"
    db.commit()
    user_id = user.id
    try:
        _google_identity(db, user, sub, email)
        _patch_claims(monkeypatch, _claims(sub, email))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 403
        assert logged.json()["detail"] == "pending_approval"
    finally:
        _delete(db, user_id)


def test_wrong_password_does_not_write_an_identity(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db)
    user_id = user.id
    phone = user.phone
    try:
        _patch_claims(monkeypatch, _claims(sub, email))
        wrong = _link(client, phone=phone, password="not-the-password")
        assert wrong.status_code == 401
        db.expire_all()
        assert (
            db.execute(select(UserIdentity).where(UserIdentity.user_id == user_id)).scalar_one_or_none()
            is None
        )
        assert db.get(User, user_id).oauth_google_sub is None
    finally:
        _delete(db, user_id)


def test_account_without_password_cannot_link(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, password=None)
    user_id = user.id
    try:
        _patch_claims(monkeypatch, _claims(sub, email))
        refused = _link(client, phone=user.phone, password="anything")
        assert refused.status_code == 409
        assert refused.json()["detail"]["code"] == "password_required"
        db.expire_all()
        assert db.execute(select(func.count()).select_from(UserIdentity)).scalar_one() >= 0
        assert (
            db.execute(select(UserIdentity).where(UserIdentity.user_id == user_id)).scalar_one_or_none()
            is None
        )
    finally:
        _delete(db, user_id)


def test_same_user_email_row_is_promoted_in_place(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email=email)
    user_id = user.id
    phone = user.phone
    row = _identity(db, user, provider="email", email=email, primary=True)
    try:
        _patch_claims(monkeypatch, _claims(sub, email))
        linked = _link(client, phone=phone, password="account-password-1")
        assert linked.status_code == 200, linked.text
        db.expire_all()
        rows = list(db.execute(select(UserIdentity).where(UserIdentity.user_id == user_id)).scalars())
        assert len(rows) == 1
        assert rows[0].id == row.id
        assert rows[0].provider == "google"
        assert rows[0].provider_subject == sub
        assert rows[0].is_primary is True
        assert db.get(User, user_id).oauth_google_sub is None
    finally:
        _delete(db, user_id)


def test_email_owned_by_another_user_or_a_revoked_row_is_refused(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    owner = _user(db)
    other = _user(db, email=email)
    owner_id = owner.id
    other_id = other.id
    phone = owner.phone
    try:
        _identity(db, other, provider="email", email=email, primary=True)
        _patch_claims(monkeypatch, _claims(sub, email))
        refused = _link(client, phone=phone, password="account-password-1")
        assert refused.status_code == 409
        assert refused.json()["detail"]["code"] == "identity_email_taken"
        db.expire_all()
        assert db.get(User, other_id) is not None
        assert db.get(User, owner_id).oauth_google_sub is None

        revoked_sub, revoked_email = _ids()
        holder = _user(db)
        holder_id = holder.id
        _identity(
            db,
            holder,
            provider="google",
            email=revoked_email,
            subject=f"old-{revoked_sub}",
            revoked=True,
        )
        _patch_claims(monkeypatch, _claims(revoked_sub, revoked_email))
        again = _link(client, phone=phone, password="account-password-1")
        assert again.status_code == 409
        assert again.json()["detail"]["code"] == "identity_email_taken"
        db.expire_all()
        assert db.get(User, holder_id) is not None
        _delete(db, holder_id)
    finally:
        _delete(db, owner_id)
        _delete(db, other_id)


def test_subject_owned_by_another_user_is_not_moved(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    partial = _user(
        db,
        status=UserStatus.pending,
        email=email,
        password=None,
        phone=f"g{sub[:31]}",
    )
    staff = _user(db, role=Role.super_admin, email=None)
    partial_id = partial.id
    staff_id = staff.id
    staff_phone = staff.phone
    try:
        identity = _google_identity(db, partial, sub, email)
        identity_id = identity.id
        _patch_claims(monkeypatch, _claims(sub, email))
        logged = _login(client, sub=sub, email=email)
        assert logged.status_code == 403
        assert logged.json()["detail"]["code"] == "google_onboarding_required"
        moved = _link(client, phone=staff_phone, password="account-password-1")
        assert moved.status_code == 409
        assert moved.json()["detail"]["code"] == "identity_subject_taken"
        db.expire_all()
        assert db.get(UserIdentity, identity_id).user_id == partial_id
        assert db.get(User, partial_id) is not None
        assert db.get(User, staff_id) is not None
        assert db.get(User, staff_id).role == Role.super_admin
        assert (
            db.execute(
                select(UserIdentity).where(
                    UserIdentity.user_id == staff_id,
                    UserIdentity.provider_subject == sub,
                )
            ).scalar_one_or_none()
            is None
        )
    finally:
        _delete(db, partial_id)
        _delete(db, staff_id)


def test_sixth_active_identity_is_refused(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email=f"primary-{email}")
    user_id = user.id
    phone = user.phone
    try:
        _identity(db, user, provider="email", email=f"primary-{email}", primary=True)
        for index in range(4):
            _identity(
                db,
                user,
                provider="google",
                email=f"g{index}-{email}",
                subject=f"extra-{index}-{sub}",
            )
        _patch_claims(monkeypatch, _claims(sub, email))
        refused = _link(client, phone=phone, password="account-password-1")
        assert refused.status_code == 409
        assert refused.json()["detail"]["code"] == "identity_limit_reached"
        db.expire_all()
        active = db.execute(
            select(func.count())
            .select_from(UserIdentity)
            .where(UserIdentity.user_id == user_id, UserIdentity.revoked_at.is_(None))
        ).scalar_one()
        assert active == 5
    finally:
        _delete(db, user_id)


def test_known_google_email_updates_when_free_and_refuses_a_conflict(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email=email)
    user_id = user.id
    phone_before = user.phone
    password_before = user.password_hash
    try:
        _google_identity(db, user, sub, email)
        free_email = f"new-{email}"
        _patch_claims(monkeypatch, _claims(sub, free_email))
        logged = _login(client, sub=sub, email=free_email)
        assert logged.status_code == 200, logged.text
        payload = decode_access_token(logged.json()["access_token"])
        assert payload["sub"] == str(user_id)
        assert set(payload) == {"sub", "role", "iat", "exp", "token_version"}
        db.expire_all()
        account = db.get(User, user_id)
        assert account.email == free_email
        assert account.phone == phone_before
        assert account.password_hash == password_before
        assert account.oauth_google_sub is None
        identity = db.execute(
            select(UserIdentity).where(UserIdentity.user_id == user_id)
        ).scalar_one()
        assert identity.email == free_email

        other = _user(db, email=f"taken-{email}")
        other_id = other.id
        _identity(db, other, provider="email", email=f"taken-{email}", primary=True)
        _patch_claims(monkeypatch, _claims(sub, f"taken-{email}"))
        clash = _login(client, sub=sub, email=f"taken-{email}")
        assert clash.status_code == 409
        assert clash.json()["detail"] == "google_email_mismatch"
        assert "access_token" not in clash.json()
        db.expire_all()
        assert db.get(User, user_id).email == free_email
        assert db.get(UserIdentity, identity.id).email == free_email
        _delete(db, other_id)
    finally:
        _delete(db, user_id)


def test_strong_auth_is_bound_to_the_access_token_and_is_not_a_session(
    client: TestClient, db: Session
) -> None:
    user = _user(db)
    user_id = user.id
    phone = user.phone
    try:
        logged = client.post(
            "/auth/login",
            json={"phone": phone, "password": "account-password-1"},
        )
        assert logged.status_code == 200, logged.text
        access = logged.json()["access_token"]
        claims = decode_access_token(access)
        proof = client.post(
            "/auth/reauth",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {access}"},
        )
        assert proof.status_code == 200, proof.text
        token = proof.json()["reauth_token"]
        assert verify_strong_auth_proof(
            token,
            user_id=str(user_id),
            token_version=0,
            access_iat=int(claims["iat"]),
        )
        assert not verify_strong_auth_proof(
            token,
            user_id=str(user_id),
            token_version=0,
            access_iat=int(claims["iat"]) + 30,
        )
        assert not verify_strong_auth_proof(
            token,
            user_id=str(user_id),
            token_version=1,
            access_iat=int(claims["iat"]),
        )
        expired = jwt.encode(
            {
                "sub": str(user_id),
                "user_id": str(user_id),
                "token_version": 0,
                "purpose": "strong_auth",
                "access_iat": int(claims["iat"]),
                "iat": datetime.now(timezone.utc) - timedelta(minutes=30),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=20),
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        assert not verify_strong_auth_proof(
            expired,
            user_id=str(user_id),
            token_version=0,
            access_iat=int(claims["iat"]),
        )
        session = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert session.status_code == 401
        failed = client.post(
            "/auth/reauth",
            json={"password": "wrong-password"},
            headers={"Authorization": f"Bearer {access}"},
        )
        assert failed.status_code == 401
        db.expire_all()
        events = list(
            db.execute(
                select(AuditEvent).where(
                    AuditEvent.event_type.in_(["strong_reauth_success", "strong_reauth_failed"]),
                    AuditEvent.payload["user_id"].astext == str(user_id),
                )
            ).scalars()
        )
        assert {event.event_type for event in events} >= {
            "strong_reauth_success",
            "strong_reauth_failed",
        }
        for event in events:
            assert set(event.payload) <= {"user_id", "identity_id", "provider", "result"}
            assert "password" not in str(event.payload)
        unused = create_strong_auth_proof(
            user_id=str(user_id), token_version=0, access_iat=int(claims["iat"])
        )
        assert unused["token"]
    finally:
        _delete(db, user_id)


def test_onboarding_creates_the_user_only_at_the_end(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    phone = unique_test_phone()
    _patch_claims(monkeypatch, _claims(sub, email))
    before = db.execute(select(func.count()).select_from(User)).scalar_one()
    started = _login(client, sub=sub, email=email)
    assert started.status_code == 409
    assert db.execute(select(func.count()).select_from(User)).scalar_one() == before
    done = _complete(client, phone=phone)
    assert done.status_code == 200, done.text
    created = db.execute(select(User).where(User.phone == phone)).scalar_one()
    created_id = created.id
    try:
        assert created.oauth_google_sub is None
        assert created.status == UserStatus.active
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == before + 1
    finally:
        _delete(db, created_id)
