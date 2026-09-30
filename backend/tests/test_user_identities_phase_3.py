"""Phase III: move one identity row. No account merge and no prod UUIDs."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.auth.passwords import hash_password
from app.db.models.audit_event import AuditEvent
from app.db.models.device_push_token import DevicePushToken
from app.db.models.interaction_log import InteractionLog
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.db.models.user_legal_acceptance import UserLegalAcceptance
from app.db.session import engine
from app.main import app
from app.models.enums import Role, TripStatus, UserStatus
from app.services.user_identities import IdentityTransferError, transfer_identity
from tests.support.unique_phone import unique_test_phone

_REASON = "transferir identity de teste"
_CONFIRM = "TRANSFERIR_IDENTITY"


def _user(
    db: Session,
    *,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
    email: str | None = None,
    password: str | None = None,
    legacy_sub: str | None = None,
) -> User:
    user = User(
        role=role,
        name="Conta",
        phone=unique_test_phone(),
        email=email,
        status=status,
        password_hash=hash_password(password) if password else None,
        requested_role="passenger" if status == UserStatus.pending else None,
        oauth_google_sub=legacy_sub,
        token_version=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _identity(
    db: Session,
    user: User,
    *,
    provider: str = "google",
    email: str | None,
    subject: str | None,
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


def _pair(db: Session) -> tuple[User, User, User, UserIdentity, UserIdentity]:
    source_email = f"src-{uuid.uuid4().hex[:8]}@example.com"
    dest_email = f"dst-{uuid.uuid4().hex[:8]}@example.com"
    actor = _user(
        db,
        role=Role.super_admin,
        email=f"actor-{uuid.uuid4().hex[:8]}@example.com",
        password="actor-password-1",
    )
    source = _user(
        db,
        status=UserStatus.pending,
        email=source_email,
        legacy_sub=f"legacy-src-{uuid.uuid4().hex}",
    )
    destination = _user(
        db,
        email=dest_email,
        password="dest-password-1",
        legacy_sub=f"legacy-dst-{uuid.uuid4().hex}",
    )
    source_identity = _identity(
        db,
        source,
        email=source_email,
        subject=f"sub-src-{uuid.uuid4().hex}",
        primary=True,
    )
    dest_identity = _identity(
        db,
        destination,
        email=dest_email,
        subject=f"sub-dst-{uuid.uuid4().hex}",
        primary=True,
    )
    return actor, source, destination, source_identity, dest_identity


def _move(
    db: Session,
    actor: User,
    source: User,
    destination: User,
    identity: UserIdentity,
) -> uuid.UUID:
    return transfer_identity(
        db,
        source_user_id=source.id,
        destination_user_id=destination.id,
        identity_id=identity.id,
        actor_user_id=actor.id,
    )


def _cleanup(db: Session, *user_ids: uuid.UUID) -> None:
    db.rollback()
    if not user_ids:
        return
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM trips WHERE passenger_id = ANY(:ids)"),
            {"ids": list(user_ids)},
        )
        conn.execute(
            text("DELETE FROM interaction_logs WHERE user_id = ANY(:ids)"),
            {"ids": [str(item) for item in user_ids]},
        )
        conn.execute(
            text("DELETE FROM user_legal_acceptances WHERE user_id = ANY(:ids)"),
            {"ids": list(user_ids)},
        )
        conn.execute(
            text("DELETE FROM users WHERE id = ANY(:ids)"),
            {"ids": list(user_ids)},
        )


def _events(db: Session, identity_id: uuid.UUID, event_type: str) -> list[AuditEvent]:
    return list(
        db.execute(
            select(AuditEvent).where(
                AuditEvent.entity_id == str(identity_id),
                AuditEvent.event_type == event_type,
            )
        ).scalars()
    )


def test_transfer_moves_the_same_row_and_blocks_source(db: Session) -> None:
    actor, source, destination, moved, kept = _pair(db)
    ids = [actor.id, source.id, destination.id]
    try:
        source_email = source.email
        dest_email = destination.email
        source_sub = source.oauth_google_sub
        dest_sub = destination.oauth_google_sub
        source_phone = source.phone
        source_version = source.token_version
        source_role = source.role
        source_requested = source.requested_role
        created_at = source.created_at
        had_password = source.password_hash is not None
        users_before = db.execute(select(func.count()).select_from(User)).scalar_one()
        trip = Trip(
            passenger_id=source.id,
            status=TripStatus.requested,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10,
        )
        db.add(trip)
        db.add(
            UserLegalAcceptance(
                user_id=source.id,
                terms_version="2026-09-16",
                privacy_version="2026-09-16",
                source="register_google",
            )
        )
        db.add(
            InteractionLog(
                user_id=str(source.id),
                role="passenger",
                action="open",
            )
        )
        db.commit()
        trip_id = trip.id

        result = _move(db, actor, source, destination, moved)
        db.expire_all()
        assert result == moved.id
        row = db.get(UserIdentity, moved.id)
        assert row is not None
        assert row.user_id == destination.id
        assert row.is_primary is False
        assert db.get(UserIdentity, kept.id).is_primary is True
        assert db.get(UserIdentity, kept.id).user_id == destination.id
        assert (
            db.execute(
                select(func.count())
                .select_from(UserIdentity)
                .where(
                    UserIdentity.user_id == destination.id,
                    UserIdentity.revoked_at.is_(None),
                )
            ).scalar_one()
            == 2
        )
        assert (
            db.execute(
                select(func.count())
                .select_from(UserIdentity)
                .where(
                    UserIdentity.user_id == source.id,
                    UserIdentity.revoked_at.is_(None),
                )
            ).scalar_one()
            == 0
        )
        source_after = db.get(User, source.id)
        dest_after = db.get(User, destination.id)
        assert source_after is not None and dest_after is not None
        assert source_after.status == UserStatus.blocked
        assert source_after.email is None
        assert dest_after.email == dest_email
        assert source_after.oauth_google_sub == source_sub
        assert dest_after.oauth_google_sub == dest_sub
        assert source_after.phone == source_phone
        assert source_after.token_version == source_version
        assert source_after.role == source_role
        assert source_after.requested_role == source_requested
        assert source_after.created_at == created_at
        assert (source_after.password_hash is not None) is had_password
        assert db.get(Trip, trip_id).passenger_id == source.id
        assert (
            db.execute(
                select(UserLegalAcceptance.user_id).where(
                    UserLegalAcceptance.user_id == source.id
                )
            ).scalar_one()
            == source.id
        )
        assert (
            db.execute(
                select(InteractionLog.user_id).where(
                    InteractionLog.user_id == str(source.id)
                )
            ).scalar_one()
            == str(source.id)
        )
        assert db.execute(select(func.count()).select_from(User)).scalar_one() == users_before
        transferred = _events(db, moved.id, "identity_transferred")
        blocked = _events(db, moved.id, "source_account_blocked")
        assert len(transferred) == 1
        assert len(blocked) == 1
        assert set(transferred[0].payload) == {
            "source_user_id",
            "destination_user_id",
            "identity_id",
            "provider",
            "result",
        }
        assert transferred[0].payload["result"] == "ok"
        assert transferred[0].payload["provider"] == "google"
        assert source_email not in str(transferred[0].payload)
    finally:
        _cleanup(db, *ids)


@pytest.mark.parametrize(
    ("mutate", "code"),
    [
        ("same", "source_destination_same"),
        ("missing_source", "source_not_found"),
        ("missing_destination", "destination_not_found"),
        ("missing_identity", "identity_not_found"),
        ("foreign_identity", "identity_owner_mismatch"),
        ("revoked", "identity_revoked"),
        ("dest_inactive", "destination_not_active"),
        ("no_primary", "destination_primary_missing"),
        ("email_taken", "identity_email_taken"),
        ("limit", "identity_limit_reached"),
        ("staff_source", "source_not_transferable"),
        ("bad_actor", "actor_invalid"),
    ],
)
def test_transfer_preconditions_do_not_write(
    db: Session, mutate: str, code: str
) -> None:
    actor, source, destination, moved, kept = _pair(db)
    extra: list[uuid.UUID] = []
    try:
        source_id = source.id
        dest_id = destination.id
        identity_id = moved.id
        actor_id = actor.id
        if mutate == "same":
            dest_id = source.id
        elif mutate == "missing_source":
            source_id = uuid.uuid4()
        elif mutate == "missing_destination":
            dest_id = uuid.uuid4()
        elif mutate == "missing_identity":
            identity_id = uuid.uuid4()
        elif mutate == "foreign_identity":
            other = _user(db, email=f"other-{uuid.uuid4().hex[:8]}@example.com")
            extra.append(other.id)
            foreign = _identity(
                db,
                other,
                email=other.email,
                subject=f"sub-other-{uuid.uuid4().hex}",
                primary=True,
            )
            identity_id = foreign.id
        elif mutate == "revoked":
            moved.is_primary = False
            moved.revoked_at = datetime.now(timezone.utc)
            db.commit()
        elif mutate == "dest_inactive":
            destination.status = UserStatus.pending
            db.commit()
        elif mutate == "no_primary":
            kept.is_primary = False
            destination.email = None
            db.commit()
        elif mutate == "email_taken":
            taken = moved.email
            source.email = None
            db.commit()
            holder = _user(db, email=taken)
            extra.append(holder.id)
        elif mutate == "limit":
            for index in range(4):
                _identity(
                    db,
                    destination,
                    provider="email",
                    email=f"extra-{index}-{uuid.uuid4().hex[:8]}@example.com",
                    subject=None,
                    primary=False,
                )
        elif mutate == "staff_source":
            source.role = Role.admin
            db.commit()
        elif mutate == "bad_actor":
            actor.role = Role.passenger
            db.commit()
        status_before = db.get(User, source.id).status
        with pytest.raises(IdentityTransferError) as caught:
            transfer_identity(
                db,
                source_user_id=source_id,
                destination_user_id=dest_id,
                identity_id=identity_id,
                actor_user_id=actor_id,
            )
        assert caught.value.code == code
        db.expire_all()
        assert db.get(User, source.id).status == status_before
        assert _events(db, moved.id, "identity_transferred") == []
    finally:
        _cleanup(db, actor.id, source.id, destination.id, *extra)


def test_subject_conflict_does_not_write(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    actor, source, destination, moved, _kept = _pair(db)
    try:
        monkeypatch.setattr(
            "app.services.user_identities._subject_conflicts",
            lambda _db, _identity: True,
        )
        with pytest.raises(IdentityTransferError) as caught:
            _move(db, actor, source, destination, moved)
        assert caught.value.code == "identity_subject_taken"
        db.expire_all()
        assert db.get(UserIdentity, moved.id).user_id == source.id
        assert _events(db, moved.id, "identity_transferred") == []
    finally:
        _cleanup(db, actor.id, source.id, destination.id)


def test_commit_failure_rolls_back_success_audit(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    actor, source, destination, moved, _kept = _pair(db)
    try:
        def _boom(self: Session) -> None:
            raise RuntimeError("commit failed")

        monkeypatch.setattr(Session, "commit", _boom)
        with pytest.raises(RuntimeError, match="commit failed"):
            _move(db, actor, source, destination, moved)
        db.expire_all()
        assert db.get(User, source.id).status == UserStatus.pending
        assert db.get(User, source.id).email is not None
        assert db.get(UserIdentity, moved.id).user_id == source.id
        assert db.get(UserIdentity, moved.id).is_primary is True
        assert _events(db, moved.id, "identity_transferred") == []
        assert _events(db, moved.id, "source_account_blocked") == []
    finally:
        _cleanup(db, actor.id, source.id, destination.id)


def test_source_push_tokens_are_deactivated_and_stay(db: Session) -> None:
    actor, source, destination, moved, _kept = _pair(db)
    try:
        token = DevicePushToken(
            user_id=source.id,
            token=f"push-{uuid.uuid4().hex}",
            platform="android",
            active=True,
        )
        db.add(token)
        db.commit()
        token_id = token.id
        _move(db, actor, source, destination, moved)
        db.expire_all()
        stored = db.get(DevicePushToken, token_id)
        assert stored is not None
        assert stored.user_id == source.id
        assert stored.active is False
    finally:
        _cleanup(db, actor.id, source.id, destination.id)


def test_transfer_endpoint_requires_super_admin(
    client: TestClient, db: Session
) -> None:
    actor, source, destination, moved, _kept = _pair(db)
    body = {
        "source_user_id": str(source.id),
        "destination_user_id": str(destination.id),
        "identity_id": str(moved.id),
        "confirmation": _CONFIRM,
        "governance_reason": _REASON,
    }
    try:
        anonymous = client.post("/admin/identities/transfer", json=body)
        assert anonymous.status_code == 401

        async def _admin() -> UserContext:
            return UserContext(user_id=str(actor.id), role=Role.admin)

        app.dependency_overrides[get_current_user] = _admin
        forbidden = client.post("/admin/identities/transfer", json=body)
        assert forbidden.status_code == 403
        assert forbidden.json()["detail"] == "super_admin_required"

        async def _super() -> UserContext:
            return UserContext(user_id=str(actor.id), role=Role.super_admin)

        app.dependency_overrides[get_current_user] = _super
        rejected = client.post(
            "/admin/identities/transfer",
            json={**body, "confirmation": "NAO"},
        )
        assert rejected.status_code == 400
        assert rejected.json()["detail"] == "invalid_confirmation"
        db.expire_all()
        assert db.get(UserIdentity, moved.id).user_id == source.id

        moved_ok = client.post("/admin/identities/transfer", json=body)
        assert moved_ok.status_code == 200
        assert moved_ok.json()["identity_id"] == str(moved.id)
        db.expire_all()
        assert db.get(UserIdentity, moved.id).user_id == destination.id
        assert db.get(User, source.id).status == UserStatus.blocked
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        _cleanup(db, actor.id, source.id, destination.id)
