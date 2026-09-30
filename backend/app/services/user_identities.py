"""Login identities. Google auth reads this table; legacy columns are historical."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.db.models.audit_event import AuditEvent
from app.db.models.device_push_token import DevicePushToken
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.models.enums import Role, UserStatus

ACTIVE_IDENTITY_LIMIT = 5


class IdentityBackfillAborted(RuntimeError):
    """Legacy rows are not safe to copy. No identity rows were inserted."""


class IdentityMirrorConflict(RuntimeError):
    """This user's legacy login does not match `user_identities`.

    Ownership is left unchanged.
    """


def normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def normalize_google_subject(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def count_active_identities(db: Session, user_id: uuid.UUID) -> int:
    """Active rows for one user. Revoked rows are excluded. Not a backfill cap."""
    return int(
        db.execute(
            select(func.count())
            .select_from(UserIdentity)
            .where(
                UserIdentity.user_id == user_id,
                UserIdentity.revoked_at.is_(None),
            )
        ).scalar_one()
    )


def lookup_identity_by_email(db: Session, email: str) -> UserIdentity | None:
    normalized = normalize_email(email)
    if normalized is None:
        return None
    return db.execute(
        select(UserIdentity).where(UserIdentity.email == normalized)
    ).scalar_one_or_none()


def lookup_identity_by_google_subject(
    db: Session, subject: str
) -> UserIdentity | None:
    normalized = normalize_google_subject(subject)
    if normalized is None:
        return None
    return db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "google",
            UserIdentity.provider_subject == normalized,
        )
    ).scalar_one_or_none()


def release_active_identities(db: Session, user_id: uuid.UUID) -> None:
    """Drop active mirror rows. Revoked rows keep their email and subject."""
    rows = list(
        db.execute(
            select(UserIdentity).where(
                UserIdentity.user_id == user_id,
                UserIdentity.revoked_at.is_(None),
            )
        ).scalars()
    )
    for row in rows:
        db.delete(row)
    if rows:
        db.flush()


def mirror_legacy_login(db: Session, user: User) -> None:
    """Make this user's active identity match `users.email` / `oauth_google_sub`.

    Does not read identities for authentication. Does not delete the user.
    An email row of the same user is promoted to Google instead of inserting
    a second row with the same address.
    """
    email = normalize_email(user.email)
    subject = normalize_google_subject(user.oauth_google_sub)
    if email is None and subject is None:
        release_active_identities(db, user.id)
        return

    _refuse_foreign_owner(db, user.id, email=email, subject=subject)
    active = _active_for_user(db, user.id)
    if len(active) > 1:
        raise IdentityMirrorConflict(
            "identity mirror conflict: "
            f"code=multiple_active user_id={user.id} count={len(active)}"
        )
    if not active:
        db.add(
            UserIdentity(
                user_id=user.id,
                provider="google" if subject else "email",
                email=email,
                provider_subject=subject,
                is_primary=True,
                is_verified=True,
            )
        )
        return

    row = active[0]
    if row.is_primary is not True:
        raise IdentityMirrorConflict(
            "identity mirror conflict: "
            f"code=primary_missing user_id={user.id} identity_id={row.id}"
        )
    if subject:
        _apply_google_mirror(row, email=email, subject=subject, user_id=user.id)
        return
    if (
        row.provider == "email"
        and row.provider_subject is None
        and row.email == email
    ):
        row.is_verified = True
        return
    raise IdentityMirrorConflict(
        "identity mirror conflict: "
        f"code=incompatible user_id={user.id} identity_id={row.id}"
    )


def backfill_user_identities(connection: Connection) -> None:
    """Copy `users.email` / `users.oauth_google_sub` into `user_identities`.

    Idempotent. Does not change phone, password, role, or status.
    Aborts, without writing, when legacy and identities disagree.
    A later run promotes an email row to google when that same user gained a sub,
    instead of inserting a second row for the same address.
    """
    _abort_if_legacy_inconsistent(connection)
    _promote_email_rows_that_gained_google(connection)
    _insert_missing_identities(connection)


def _refuse_foreign_owner(
    db: Session,
    user_id: uuid.UUID,
    *,
    email: str | None,
    subject: str | None,
) -> None:
    if email is not None:
        owner_id = db.execute(
            select(UserIdentity.user_id).where(
                UserIdentity.email == email,
                UserIdentity.user_id != user_id,
            )
        ).scalar_one_or_none()
        if owner_id is not None:
            raise IdentityMirrorConflict(
                "identity mirror conflict: "
                f"code=email_owned_by_other user_id={user_id} other_user_id={owner_id}"
            )
    if subject is not None:
        owner_id = db.execute(
            select(UserIdentity.user_id).where(
                UserIdentity.provider == "google",
                UserIdentity.provider_subject == subject,
                UserIdentity.user_id != user_id,
            )
        ).scalar_one_or_none()
        if owner_id is not None:
            raise IdentityMirrorConflict(
                "identity mirror conflict: "
                f"code=subject_owned_by_other user_id={user_id} other_user_id={owner_id}"
            )


def _active_for_user(db: Session, user_id: uuid.UUID) -> list[UserIdentity]:
    return list(
        db.execute(
            select(UserIdentity).where(
                UserIdentity.user_id == user_id,
                UserIdentity.revoked_at.is_(None),
            )
        ).scalars()
    )


def _apply_google_mirror(
    row: UserIdentity,
    *,
    email: str | None,
    subject: str,
    user_id: uuid.UUID,
) -> None:
    if row.provider == "google" and row.provider_subject == subject:
        if row.email != email:
            row.email = email
        row.is_verified = True
        return
    if row.provider == "email" and row.provider_subject is None and row.email == email:
        row.provider = "google"
        row.provider_subject = subject
        row.email = email
        row.is_verified = True
        return
    raise IdentityMirrorConflict(
        "identity mirror conflict: "
        f"code=incompatible user_id={user_id} identity_id={row.id}"
    )


def _abort_if_legacy_inconsistent(connection: Connection) -> None:
    row = connection.execute(
        text(
            """
            SELECT
              (
                SELECT count(*) FROM (
                  SELECT lower(btrim(email)) AS email_key
                  FROM users
                  WHERE nullif(btrim(email), '') IS NOT NULL
                  GROUP BY 1
                  HAVING count(*) > 1
                ) duplicate_emails
              ) AS duplicate_emails,
              (
                SELECT count(*) FROM (
                  SELECT btrim(oauth_google_sub) AS sub_key
                  FROM users
                  WHERE nullif(btrim(oauth_google_sub), '') IS NOT NULL
                  GROUP BY 1
                  HAVING count(*) > 1
                ) duplicate_subs
              ) AS duplicate_subs,
              (
                SELECT count(*)
                FROM users
                WHERE oauth_google_sub IS NOT NULL
                  AND nullif(btrim(oauth_google_sub), '') IS NULL
              ) AS blank_subs,
              (
                SELECT count(*)
                FROM users AS account
                JOIN user_identities AS identity
                  ON identity.email = nullif(lower(btrim(account.email)), '')
                WHERE nullif(btrim(account.email), '') IS NOT NULL
                  AND identity.user_id <> account.id
              ) AS legacy_email_owned_by_other,
              (
                SELECT count(*)
                FROM users AS account
                JOIN user_identities AS identity
                  ON identity.provider = 'google'
                 AND identity.provider_subject = nullif(btrim(account.oauth_google_sub), '')
                WHERE nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
                  AND identity.user_id <> account.id
              ) AS legacy_sub_owned_by_other,
              (
                SELECT count(*)
                FROM user_identities AS identity
                JOIN users AS account ON account.id = identity.user_id
                WHERE identity.revoked_at IS NULL
                  AND identity.provider = 'google'
                  AND nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
                  AND identity.provider_subject
                      IS DISTINCT FROM nullif(btrim(account.oauth_google_sub), '')
              ) AS incompatible_google_subject,
              (
                SELECT count(*)
                FROM user_identities AS identity
                JOIN users AS account ON account.id = identity.user_id
                WHERE identity.revoked_at IS NULL
                  AND identity.provider = 'email'
                  AND identity.email
                      IS DISTINCT FROM nullif(lower(btrim(account.email)), '')
              ) AS incompatible_email,
              (
                SELECT count(*) FROM (
                  SELECT user_id
                  FROM user_identities
                  WHERE revoked_at IS NULL
                  GROUP BY user_id
                  HAVING count(*) > 1
                ) multiple_active
              ) AS multiple_active_identities,
              (
                SELECT count(*) FROM (
                  SELECT user_id
                  FROM user_identities
                  WHERE is_primary AND revoked_at IS NULL
                  GROUP BY user_id
                  HAVING count(*) > 1
                ) multiple_primaries
              ) AS multiple_active_primaries,
              (
                SELECT count(*) FROM (
                  SELECT user_id
                  FROM user_identities
                  WHERE revoked_at IS NULL
                  GROUP BY user_id
                  HAVING count(*) FILTER (WHERE is_primary) <> 1
                ) missing_primary
              ) AS active_without_single_primary,
              (
                SELECT count(*)
                FROM user_identities
                WHERE provider = 'google'
                  AND (
                    provider_subject IS NULL
                    OR btrim(provider_subject) = ''
                  )
              ) AS invalid_google_subject,
              (
                SELECT count(*)
                FROM user_identities
                WHERE provider = 'email'
                  AND (
                    email IS NULL
                    OR btrim(email) = ''
                    OR email <> lower(email)
                    OR email <> btrim(email)
                  )
              ) AS invalid_email_identity
            """
        )
    ).one()
    counts = {
        "duplicate_emails": int(row.duplicate_emails),
        "duplicate_google_subs": int(row.duplicate_subs),
        "blank_google_subs": int(row.blank_subs),
        "legacy_email_owned_by_other": int(row.legacy_email_owned_by_other),
        "legacy_sub_owned_by_other": int(row.legacy_sub_owned_by_other),
        "incompatible_google_subject": int(row.incompatible_google_subject),
        "incompatible_email": int(row.incompatible_email),
        "multiple_active_identities": int(row.multiple_active_identities),
        "multiple_active_primaries": int(row.multiple_active_primaries),
        "active_without_single_primary": int(row.active_without_single_primary),
        "invalid_google_subject": int(row.invalid_google_subject),
        "invalid_email_identity": int(row.invalid_email_identity),
    }
    # Several active identities are valid after Phase II-B. A frozen
    # oauth_google_sub no longer has to match every Google identity.
    blocking = {
        name: value
        for name, value in counts.items()
        if name not in {"multiple_active_identities", "active_without_single_primary"}
    }
    if any(blocking.values()):
        detail = " ".join(f"{name}={value}" for name, value in counts.items())
        raise IdentityBackfillAborted(f"user_identities backfill aborted: {detail}")


def _promote_email_rows_that_gained_google(connection: Connection) -> None:
    connection.execute(
        text(
            """
            UPDATE user_identities AS identity
            SET provider = 'google',
                provider_subject = nullif(btrim(account.oauth_google_sub), ''),
                email = nullif(lower(btrim(account.email)), ''),
                is_verified = true,
                updated_at = now()
            FROM users AS account
            WHERE identity.user_id = account.id
              AND identity.provider = 'email'
              AND identity.revoked_at IS NULL
              AND identity.is_primary = true
              AND nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
              AND identity.email IS NOT DISTINCT FROM nullif(lower(btrim(account.email)), '')
              AND NOT EXISTS (
                SELECT 1
                FROM user_identities AS existing_google
                WHERE existing_google.provider = 'google'
                  AND existing_google.provider_subject
                      = nullif(btrim(account.oauth_google_sub), '')
              )
            """
        )
    )


def _insert_missing_identities(connection: Connection) -> None:
    connection.execute(
        text(
            """
            INSERT INTO user_identities (
                id,
                user_id,
                provider,
                email,
                provider_subject,
                is_primary,
                is_verified,
                created_at,
                updated_at,
                revoked_at
            )
            SELECT
                gen_random_uuid(),
                account.id,
                CASE
                    WHEN nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
                    THEN 'google'
                    ELSE 'email'
                END,
                nullif(lower(btrim(account.email)), ''),
                nullif(btrim(account.oauth_google_sub), ''),
                true,
                true,
                now(),
                now(),
                NULL
            FROM users AS account
            WHERE (
                nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
                OR nullif(lower(btrim(account.email)), '') IS NOT NULL
            )
            AND NOT EXISTS (
                SELECT 1
                FROM user_identities AS identity
                WHERE identity.user_id = account.id
                  AND identity.revoked_at IS NULL
            )
            """
        )
    )


class IdentityEmailTaken(Exception):
    """The email belongs to another identity, including a revoked row."""


class IdentitySubjectTaken(Exception):
    """The Google subject belongs to another identity, including a revoked row."""


class IdentityLimitReached(Exception):
    """The account already has the maximum number of active identities."""


def record_identity_event(
    db: Session,
    *,
    event_type: str,
    user_id: uuid.UUID | None,
    identity_id: uuid.UUID | None,
    provider: str,
    result: str,
) -> None:
    """Audit without password, token, subject, email, or phone."""
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type="user_identity",
            entity_id=str(identity_id or user_id or "none")[:64],
            payload={
                "user_id": str(user_id) if user_id else None,
                "identity_id": str(identity_id) if identity_id else None,
                "provider": provider,
                "result": result,
            },
            occurred_at=datetime.now(timezone.utc),
        )
    )


def email_owned_elsewhere(
    db: Session,
    email: str,
    *,
    user_id: uuid.UUID,
    except_identity_id: uuid.UUID | None = None,
    allow_same_user_email_provider: bool = False,
) -> bool:
    """True when this email cannot be written onto the given identity."""
    normalized = normalize_email(email)
    if normalized is None:
        return True
    existing = lookup_identity_by_email(db, normalized)
    if existing is not None and existing.id != except_identity_id:
        promotable = (
            allow_same_user_email_provider
            and existing.user_id == user_id
            and existing.revoked_at is None
            and existing.provider == "email"
            and existing.provider_subject is None
        )
        if not promotable:
            return True
    other_user = db.execute(
        select(User.id).where(func.lower(User.email) == normalized, User.id != user_id)
    ).scalar_one_or_none()
    return other_user is not None


def sync_known_google_email(
    db: Session, user: User, identity: UserIdentity, email: str
) -> None:
    """Update a known Google identity when Google returns a new verified email."""
    normalized = normalize_email(email)
    if normalized is None:
        raise IdentityEmailTaken()
    if identity.email == normalized:
        identity.is_verified = True
        return
    if email_owned_elsewhere(
        db,
        normalized,
        user_id=user.id,
        except_identity_id=identity.id,
    ):
        raise IdentityEmailTaken()
    identity.email = normalized
    identity.is_verified = True
    if identity.is_primary:
        user.email = normalized


def attach_google_identity(
    db: Session, user: User, *, email: str, subject: str
) -> UserIdentity:
    """Link Google to this user. Promotes a same-user email row in place.

    Does not write ``users.oauth_google_sub`` and does not delete users.
    """
    normalized_email = normalize_email(email)
    normalized_subject = normalize_google_subject(subject)
    if normalized_email is None or normalized_subject is None:
        raise IdentityEmailTaken()
    locked = db.execute(
        select(User).where(User.id == user.id).with_for_update()
    ).scalar_one()
    existing_subject = lookup_identity_by_google_subject(db, normalized_subject)
    if existing_subject is not None and (
        existing_subject.user_id != locked.id or existing_subject.revoked_at is not None
    ):
        raise IdentitySubjectTaken()
    if existing_subject is not None:
        sync_known_google_email(db, locked, existing_subject, normalized_email)
        return existing_subject
    if email_owned_elsewhere(
        db,
        normalized_email,
        user_id=locked.id,
        allow_same_user_email_provider=True,
    ):
        raise IdentityEmailTaken()
    promotable = lookup_identity_by_email(db, normalized_email)
    if (
        promotable is not None
        and promotable.user_id == locked.id
        and promotable.revoked_at is None
        and promotable.provider == "email"
        and promotable.provider_subject is None
    ):
        promotable.provider = "google"
        promotable.provider_subject = normalized_subject
        promotable.is_verified = True
        promotable.email = normalized_email
        if promotable.is_primary:
            locked.email = normalized_email
        db.flush()
        return promotable
    active = count_active_identities(db, locked.id)
    if active >= ACTIVE_IDENTITY_LIMIT:
        raise IdentityLimitReached()
    contact = (locked.email or "").strip().lower()
    if active == 0 and contact and contact != normalized_email:
        if email_owned_elsewhere(db, contact, user_id=locked.id):
            raise IdentityEmailTaken()
        db.add(
            UserIdentity(
                user_id=locked.id,
                provider="email",
                email=contact,
                provider_subject=None,
                is_primary=True,
                is_verified=True,
            )
        )
        db.flush()
        active = 1
    is_primary = active == 0
    row = UserIdentity(
        user_id=locked.id,
        provider="google",
        email=normalized_email,
        provider_subject=normalized_subject,
        is_primary=is_primary,
        is_verified=True,
    )
    db.add(row)
    db.flush()
    if is_primary:
        locked.email = normalized_email
    return row


class IdentityTransferError(Exception):
    """Transfer refused before any durable write. ``code`` is the public reason."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def transfer_identity(
    db: Session,
    *,
    source_user_id: uuid.UUID,
    destination_user_id: uuid.UUID,
    identity_id: uuid.UUID,
    actor_user_id: uuid.UUID,
) -> uuid.UUID:
    """Move one identity row onto another user and block the source.

    The identity id does not change. Nothing else on either user moves.
    ``users.oauth_google_sub`` is not read or written. Commits, or rolls back.
    """
    try:
        _transfer_identity_locked(
            db,
            source_user_id=source_user_id,
            destination_user_id=destination_user_id,
            identity_id=identity_id,
            actor_user_id=actor_user_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return identity_id


def _transfer_identity_locked(
    db: Session,
    *,
    source_user_id: uuid.UUID,
    destination_user_id: uuid.UUID,
    identity_id: uuid.UUID,
    actor_user_id: uuid.UUID,
) -> None:
    if source_user_id == destination_user_id:
        raise IdentityTransferError("source_destination_same")

    lock_ids = sorted({source_user_id, destination_user_id, actor_user_id})
    locked = {
        row.id: row
        for row in db.execute(
            select(User).where(User.id.in_(lock_ids)).order_by(User.id).with_for_update()
        ).scalars()
    }
    source = locked.get(source_user_id)
    destination = locked.get(destination_user_id)
    actor = locked.get(actor_user_id)
    if source is None:
        raise IdentityTransferError("source_not_found")
    if destination is None:
        raise IdentityTransferError("destination_not_found")
    if (
        actor is None
        or actor.role != Role.super_admin
        or actor.status != UserStatus.active
        or actor.id == source.id
    ):
        raise IdentityTransferError("actor_invalid")
    if source.role in (Role.admin, Role.super_admin):
        raise IdentityTransferError("source_not_transferable")

    identity = db.execute(
        select(UserIdentity).where(UserIdentity.id == identity_id).with_for_update()
    ).scalar_one_or_none()
    if identity is None:
        raise IdentityTransferError("identity_not_found")
    if identity.user_id != source.id:
        raise IdentityTransferError("identity_owner_mismatch")
    if identity.revoked_at is not None:
        raise IdentityTransferError("identity_revoked")
    if destination.status != UserStatus.active:
        raise IdentityTransferError("destination_not_active")
    if count_active_identities(db, destination.id) >= ACTIVE_IDENTITY_LIMIT:
        raise IdentityTransferError("identity_limit_reached")
    destination_primary = db.execute(
        select(UserIdentity.id).where(
            UserIdentity.user_id == destination.id,
            UserIdentity.is_primary.is_(True),
            UserIdentity.revoked_at.is_(None),
        )
    ).scalar_one_or_none()
    if destination_primary is None:
        raise IdentityTransferError("destination_primary_missing")
    if _email_conflicts(db, identity, source_user_id=source.id):
        raise IdentityTransferError("identity_email_taken")
    if _subject_conflicts(db, identity):
        raise IdentityTransferError("identity_subject_taken")

    was_primary = identity.is_primary
    identity.user_id = destination.id
    identity.is_primary = False
    if was_primary:
        source.email = None
    source.status = UserStatus.blocked
    _deactivate_source_push_tokens(db, source.id)
    _record_transfer_event(
        db,
        event_type="identity_transferred",
        source_user_id=source.id,
        destination_user_id=destination.id,
        identity_id=identity.id,
        provider=identity.provider,
    )
    _record_transfer_event(
        db,
        event_type="source_account_blocked",
        source_user_id=source.id,
        destination_user_id=destination.id,
        identity_id=identity.id,
        provider=identity.provider,
    )
    db.flush()


def _email_conflicts(
    db: Session, identity: UserIdentity, *, source_user_id: uuid.UUID
) -> bool:
    email = normalize_email(identity.email)
    if email is None:
        return False
    other_identity = db.execute(
        select(UserIdentity.id).where(
            UserIdentity.email == email,
            UserIdentity.id != identity.id,
        )
    ).scalar_one_or_none()
    if other_identity is not None:
        return True
    other_user = db.execute(
        select(User.id).where(
            func.lower(User.email) == email,
            User.id != source_user_id,
        )
    ).scalar_one_or_none()
    return other_user is not None


def _subject_conflicts(db: Session, identity: UserIdentity) -> bool:
    subject = normalize_google_subject(identity.provider_subject)
    if subject is None:
        return False
    other = db.execute(
        select(UserIdentity.id).where(
            UserIdentity.provider == identity.provider,
            UserIdentity.provider_subject == subject,
            UserIdentity.id != identity.id,
        )
    ).scalar_one_or_none()
    return other is not None


def _deactivate_source_push_tokens(db: Session, source_user_id: uuid.UUID) -> None:
    rows = db.execute(
        select(DevicePushToken).where(
            DevicePushToken.user_id == source_user_id,
            DevicePushToken.active.is_(True),
        )
    ).scalars()
    now = datetime.now(timezone.utc)
    for row in rows:
        row.active = False
        row.last_seen_at = now


def _record_transfer_event(
    db: Session,
    *,
    event_type: str,
    source_user_id: uuid.UUID,
    destination_user_id: uuid.UUID,
    identity_id: uuid.UUID,
    provider: str,
) -> None:
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type="user_identity",
            entity_id=str(identity_id),
            payload={
                "source_user_id": str(source_user_id),
                "destination_user_id": str(destination_user_id),
                "identity_id": str(identity_id),
                "provider": provider,
                "result": "ok",
            },
            occurred_at=datetime.now(timezone.utc),
        )
    )
