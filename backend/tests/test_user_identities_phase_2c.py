"""Phase II-C: the signed-in user manages login identities. No user create or delete."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.routers import auth as auth_module
from app.auth.passwords import hash_password
from app.auth.security import create_access_token, create_strong_auth_proof, decode_access_token
from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.db.session import engine
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone
from tests.test_google_passenger_onboarding import (
    RAW_NONCE,
    _claims,
    _ids,
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
        requested_role=None,
        oauth_google_sub=None,
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
    verified: bool = True,
    revoked: bool = False,
) -> UserIdentity:
    row = UserIdentity(
        user_id=user.id,
        provider=provider,
        email=email,
        provider_subject=subject,
        is_primary=primary and not revoked,
        is_verified=verified,
        revoked_at=datetime.now(timezone.utc) if revoked else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _delete(db: Session, *user_ids: uuid.UUID) -> None:
    db.rollback()
    with engine.begin() as conn:
        for user_id in user_ids:
            conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})


def _token_for(user: User, *, password: str = "account-password-1") -> str:
    issued = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )
    assert password
    return issued["token"]


def _login(client: TestClient, user: User) -> str:
    logged = client.post(
        "/auth/login",
        json={"phone": user.phone, "password": "account-password-1"},
    )
    assert logged.status_code == 200, logged.text
    return logged.json()["access_token"]


def _events(db: Session, identity_id: uuid.UUID, event_type: str) -> list[AuditEvent]:
    return list(
        db.execute(
            select(AuditEvent).where(
                AuditEvent.entity_id == str(identity_id),
                AuditEvent.event_type == event_type,
            )
        ).scalars()
    )


def test_list_returns_only_active_identities_without_subject(
    client: TestClient, db: Session
) -> None:
    user = _user(db, email="primary@example.com")
    try:
        primary = _identity(
            db, user, provider="email", email="primary@example.com", primary=True
        )
        _identity(
            db,
            user,
            provider="google",
            email="old@example.com",
            subject="sub-revoked",
            revoked=True,
        )
        token = _login(client, user)
        listed = client.get("/auth/identities", headers={"Authorization": f"Bearer {token}"})
        assert listed.status_code == 200, listed.text
        body = listed.json()
        assert body["active_count"] == 1
        assert body["limit"] == 5
        assert body["identities"][0]["id"] == str(primary.id)
        assert body["identities"][0]["is_primary"] is True
        assert "provider_subject" not in body["identities"][0]
        assert "old@example.com" not in listed.text
    finally:
        _delete(db, user.id)


def test_make_primary_mirrors_email_and_null_google_email(
    client: TestClient, db: Session
) -> None:
    user = _user(db, email="first@example.com")
    user_id = user.id
    try:
        first = _identity(
            db, user, provider="email", email="first@example.com", primary=True
        )
        second = _identity(
            db, user, provider="google", email="second@example.com", subject="sub-second"
        )
        bare = _identity(
            db, user, provider="google", email=None, subject="sub-bare"
        )
        token = _login(client, user)
        version = int(user.token_version)
        changed = client.post(
            f"/auth/identities/{second.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert changed.status_code == 200, changed.text
        db.expire_all()
        account = db.get(User, user_id)
        assert account.email == "second@example.com"
        assert account.token_version == version
        assert account.oauth_google_sub is None
        assert db.get(UserIdentity, first.id).is_primary is False
        assert db.get(UserIdentity, second.id).is_primary is True
        event = _events(db, second.id, "identity_primary_changed")
        assert len(event) == 1
        assert event[0].payload["from_identity_id"] == str(first.id)
        assert "@" not in str(event[0].payload)
        cleared = client.post(
            f"/auth/identities/{bare.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert cleared.status_code == 200, cleared.text
        db.expire_all()
        assert db.get(User, user_id).email is None
        assert db.get(UserIdentity, bare.id).is_primary is True
        assert db.get(User, user_id).token_version == version
    finally:
        _delete(db, user_id)


def test_make_primary_rejects_invalid_targets(client: TestClient, db: Session) -> None:
    owner = _user(db, email="owner@example.com")
    other = _user(db, email="other@example.com")
    holder = _user(db, email="held@example.com")
    try:
        primary = _identity(
            db, owner, provider="email", email="owner@example.com", primary=True
        )
        unverified = _identity(
            db,
            owner,
            provider="email",
            email="fresh@example.com",
            verified=False,
        )
        foreign = _identity(
            db, other, provider="email", email="other@example.com", primary=True
        )
        _identity(
            db, holder, provider="email", email="holder-login@example.com", primary=True
        )
        taken = _identity(
            db, owner, provider="google", email=None, subject="sub-taken-email"
        )
        taken.email = "held@example.com"
        db.commit()
        token = _login(client, owner)
        same = client.post(
            f"/auth/identities/{primary.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert same.status_code == 409
        assert same.json()["detail"] == "already_primary"
        bad = client.post(
            f"/auth/identities/{unverified.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert bad.status_code == 409
        assert bad.json()["detail"] == "identity_not_verified"
        missing = client.post(
            f"/auth/identities/{foreign.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert missing.status_code == 404
        clash = client.post(
            f"/auth/identities/{taken.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert clash.status_code == 409
        assert clash.json()["detail"] == "identity_email_taken"
        db.expire_all()
        assert db.get(User, owner.id).email == "owner@example.com"
        assert db.get(UserIdentity, foreign.id).user_id == other.id
    finally:
        _delete(db, owner.id, other.id, holder.id)


def test_revoke_keeps_the_row_and_refuses_the_last_or_the_primary(
    client: TestClient, db: Session
) -> None:
    user = _user(db, email="keep@example.com")
    user_id = user.id
    try:
        primary = _identity(
            db, user, provider="email", email="keep@example.com", primary=True
        )
        extra = _identity(
            db, user, provider="google", email="extra@example.com", subject="sub-extra"
        )
        token = _login(client, user)
        only_header = {"Authorization": f"Bearer {token}"}
        refused_primary = client.post(
            f"/auth/identities/{primary.id}/revoke",
            json={"password": "account-password-1"},
            headers=only_header,
        )
        assert refused_primary.status_code == 409
        assert refused_primary.json()["detail"] == "primary_identity"
        version = int(db.get(User, user_id).token_version)
        revoked = client.post(
            f"/auth/identities/{extra.id}/revoke",
            json={"password": "account-password-1"},
            headers=only_header,
        )
        assert revoked.status_code == 200, revoked.text
        db.expire_all()
        row = db.get(UserIdentity, extra.id)
        assert row.revoked_at is not None
        assert row.is_primary is False
        assert row.email == "extra@example.com"
        assert row.provider_subject == "sub-extra"
        assert db.get(User, user_id).token_version == version
        assert db.get(UserIdentity, primary.id).is_primary is True
        event = _events(db, extra.id, "identity_revoked")
        assert event[0].payload["result"] == "ok"
        assert "email" not in event[0].payload
        last = client.post(
            f"/auth/identities/{primary.id}/revoke",
            json={"password": "account-password-1"},
            headers=only_header,
        )
        assert last.status_code == 409
        assert last.json()["detail"] == "last_active_identity"
        again = client.post(
            f"/auth/identities/{extra.id}/revoke",
            json={"password": "account-password-1"},
            headers=only_header,
        )
        assert again.status_code == 404
    finally:
        _delete(db, user_id)


def test_wrong_password_and_missing_password_do_not_write(
    client: TestClient, db: Session
) -> None:
    user = _user(db, email="safe@example.com")
    bare = _user(db, email="bare@example.com", password=None)
    try:
        primary = _identity(
            db, user, provider="email", email="safe@example.com", primary=True
        )
        other = _identity(
            db, user, provider="google", email="other@example.com", subject="sub-other"
        )
        _identity(db, bare, provider="google", email="bare@example.com", subject="sub-bare-user", primary=True)
        token = _login(client, user)
        wrong = client.post(
            f"/auth/identities/{other.id}/make-primary",
            json={"password": "not-the-password"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert wrong.status_code == 403
        assert wrong.json()["detail"] == "invalid_credentials"
        db.expire_all()
        assert db.get(UserIdentity, primary.id).is_primary is True
        issued = _token_for(bare)
        blocked = client.post(
            f"/auth/identities/{other.id}/make-primary",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {issued}"},
        )
        assert blocked.status_code == 403
        assert blocked.json()["detail"] == "password_required"
    finally:
        _delete(db, user.id, bare.id)


def test_staff_must_send_password_and_passenger_may_use_proof(
    client: TestClient, db: Session
) -> None:
    staff = _user(db, role=Role.super_admin, email="staff@example.com")
    passenger = _user(db, email="pax@example.com")
    try:
        staff_primary = _identity(
            db, staff, provider="email", email="staff@example.com", primary=True
        )
        staff_next = _identity(
            db, staff, provider="google", email="staff-next@example.com", subject="sub-staff"
        )
        _identity(db, passenger, provider="email", email="pax@example.com", primary=True)
        passenger_next = _identity(
            db,
            passenger,
            provider="google",
            email="pax-next@example.com",
            subject="sub-pax",
        )
        staff_token = _login(client, staff)
        staff_claims = decode_access_token(staff_token)
        staff_proof = create_strong_auth_proof(
            user_id=str(staff.id),
            token_version=int(staff.token_version),
            access_iat=int(staff_claims["iat"]),
        )["token"]
        refused = client.post(
            f"/auth/identities/{staff_next.id}/make-primary",
            json={"reauth_token": staff_proof},
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert refused.status_code == 403
        assert refused.json()["detail"] == "password_required"
        assert db.get(UserIdentity, staff_primary.id).is_primary is True
        passenger_token = _login(client, passenger)
        claims = decode_access_token(passenger_token)
        proof = client.post(
            "/auth/reauth",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {passenger_token}"},
        )
        assert proof.status_code == 200, proof.text
        changed = client.post(
            f"/auth/identities/{passenger_next.id}/make-primary",
            json={"reauth_token": proof.json()["reauth_token"]},
            headers={"Authorization": f"Bearer {passenger_token}"},
        )
        assert changed.status_code == 200, changed.text
        stale = create_strong_auth_proof(
            user_id=str(passenger.id),
            token_version=int(passenger.token_version),
            access_iat=int(claims["iat"]) + 30,
        )["token"]
        rejected = client.post(
            f"/auth/identities/{passenger_next.id}/revoke",
            json={"reauth_token": stale},
            headers={"Authorization": f"Bearer {passenger_token}"},
        )
        assert rejected.status_code == 403
        assert rejected.json()["detail"] == "strong_auth_required"
        expired = jwt.encode(
            {
                "sub": str(passenger.id),
                "user_id": str(passenger.id),
                "token_version": int(passenger.token_version),
                "purpose": "strong_auth",
                "access_iat": int(claims["iat"]),
                "iat": datetime.now(timezone.utc) - timedelta(minutes=30),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=20),
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        old = client.post(
            f"/auth/identities/{passenger_next.id}/revoke",
            json={"reauth_token": expired},
            headers={"Authorization": f"Bearer {passenger_token}"},
        )
        assert old.status_code == 403
        assert old.json()["detail"] == "strong_auth_required"
    finally:
        _delete(db, staff.id, passenger.id)


def test_add_google_promotes_email_row_and_does_not_replace_primary(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email=email)
    user_id = user.id
    before_users = db.execute(select(func.count()).select_from(User)).scalar_one()
    try:
        email_row = _identity(db, user, provider="email", email=email, primary=True)
        token = _login(client, user)
        version = int(db.get(User, user_id).token_version)
        _patch_claims(monkeypatch, _claims(sub, email))
        added = client.post(
            "/auth/identities/google",
            json={
                "id_token": "header.payload.signature-not-logged",
                "nonce": RAW_NONCE,
                "password": "account-password-1",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert added.status_code == 200, added.text
        assert added.json()["result"] == "promoted"
        db.expire_all()
        row = db.get(UserIdentity, email_row.id)
        assert row.provider == "google"
        assert row.provider_subject == sub
        assert row.is_primary is True
        account = db.get(User, user_id)
        assert account.role == Role.passenger
        assert account.token_version == version
        assert account.oauth_google_sub is None
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == before_users
        event = _events(db, email_row.id, "identity_google_added")
        assert event[0].payload["result"] == "promoted"
        assert "email" not in event[0].payload
        again = client.post(
            "/auth/identities/google",
            json={
                "id_token": "header.payload.signature-not-logged",
                "nonce": RAW_NONCE,
                "password": "account-password-1",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert again.status_code == 200, again.text
        assert again.json()["result"] == "already_linked"
        assert again.json()["active_count"] == 1
    finally:
        _delete(db, user_id)


def test_add_google_conflicts_limit_and_other_user(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = _user(db, email="full@example.com")
    other = _user(db, email="foreign@example.com")
    try:
        _identity(db, user, provider="email", email="full@example.com", primary=True)
        for index in range(4):
            _identity(
                db,
                user,
                provider="google",
                email=f"slot{index}@example.com",
                subject=f"sub-slot-{index}-{user.id.hex[:8]}",
            )
        _identity(
            db,
            other,
            provider="google",
            email="foreign@example.com",
            subject="sub-foreign",
            primary=True,
        )
        token = _login(client, user)
        sub, email = _ids()
        _patch_claims(monkeypatch, _claims(sub, email))
        limited = client.post(
            "/auth/identities/google",
            json={
                "id_token": "header.payload.signature-not-logged",
                "nonce": RAW_NONCE,
                "password": "account-password-1",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert limited.status_code == 409
        assert limited.json()["detail"] == "identity_limit_reached"
        _patch_claims(monkeypatch, _claims("sub-foreign", "foreign@example.com"))
        taken = client.post(
            "/auth/identities/google",
            json={
                "id_token": "header.payload.signature-not-logged",
                "nonce": RAW_NONCE,
                "password": "account-password-1",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert taken.status_code == 409
        assert taken.json()["detail"] in {"identity_subject_taken", "identity_email_taken"}
        db.expire_all()
        assert (
            db.execute(
                select(func.count()).select_from(UserIdentity).where(
                    UserIdentity.user_id == user.id,
                    UserIdentity.revoked_at.is_(None),
                )
            ).scalar_one()
            == 5
        )
        assert db.get(User, other.id).role == Role.passenger
    finally:
        _delete(db, user.id, other.id)


def test_add_google_from_web_code_does_not_create_a_user(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub, email = _ids()
    user = _user(db, email="phone-user@example.com")
    before = db.execute(select(func.count()).select_from(User)).scalar_one()
    try:
        _identity(
            db, user, provider="email", email="phone-user@example.com", primary=True
        )
        token = _login(client, user)

        async def _exchange(**_kwargs: object) -> dict[str, str]:
            return {"id_token": "exchanged"}

        monkeypatch.setattr(auth_module, "exchange_code_for_id_token", _exchange)
        _patch_claims(monkeypatch, _claims(sub, email))
        added = client.post(
            "/auth/identities/google",
            json={
                "code": "auth-code",
                "redirect_uri": "http://localhost:5173/auth/google/callback",
                "password": "account-password-1",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert added.status_code == 200, added.text
        assert added.json()["result"] == "added"
        assert added.json()["active_count"] == 2
        assert added.json()["identities"][0]["is_primary"] is True
        assert added.json()["identities"][0]["email"] == "phone-user@example.com"
        db.expire_all()
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == before
        assert db.get(User, user.id).email == "phone-user@example.com"
        assert db.get(User, user.id).oauth_google_sub is None
    finally:
        _delete(db, user.id)


def test_blocked_user_cannot_manage_identities(client: TestClient, db: Session) -> None:
    user = _user(db, status=UserStatus.blocked, email="blocked@example.com")
    try:
        row = _identity(
            db, user, provider="email", email="blocked@example.com", primary=True
        )
        token = _token_for(user)
        listed = client.get(
            "/auth/identities", headers={"Authorization": f"Bearer {token}"}
        )
        assert listed.status_code == 403
        assert listed.json()["detail"] == "blocked"
        changed = client.post(
            f"/auth/identities/{row.id}/revoke",
            json={"password": "account-password-1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert changed.status_code == 403
        db.expire_all()
        assert db.get(UserIdentity, row.id).revoked_at is None
    finally:
        _delete(db, user.id)


def test_commit_failure_rolls_back_primary_change(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = _user(db, email="rollback@example.com")
    user_id = user.id
    try:
        primary = _identity(
            db, user, provider="email", email="rollback@example.com", primary=True
        )
        nxt = _identity(
            db, user, provider="google", email="next@example.com", subject="sub-next"
        )
        token = _login(client, user)

        def _boom(self: Session) -> None:
            raise RuntimeError("commit failed")

        monkeypatch.setattr(Session, "commit", _boom)
        with pytest.raises(RuntimeError, match="commit failed"):
            client.post(
                f"/auth/identities/{nxt.id}/make-primary",
                json={"password": "account-password-1"},
                headers={"Authorization": f"Bearer {token}"},
            )
        db.expire_all()
        assert db.get(UserIdentity, primary.id).is_primary is True
        assert db.get(UserIdentity, nxt.id).is_primary is False
        assert db.get(User, user_id).email == "rollback@example.com"
        assert _events(db, nxt.id, "identity_primary_changed") == []
    finally:
        _delete(db, user_id)
