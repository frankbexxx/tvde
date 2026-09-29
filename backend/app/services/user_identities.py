"""Mirror of login identities. Phase II-A still authenticates from `users`."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.user_identity import UserIdentity


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
    if any(counts.values()):
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
                  AND (
                    (
                      nullif(btrim(account.oauth_google_sub), '') IS NOT NULL
                      AND identity.provider = 'google'
                      AND identity.provider_subject
                          = nullif(btrim(account.oauth_google_sub), '')
                    )
                    OR (
                      nullif(btrim(account.oauth_google_sub), '') IS NULL
                      AND identity.provider = 'email'
                      AND identity.email = nullif(lower(btrim(account.email)), '')
                    )
                  )
            )
            """
        )
    )
