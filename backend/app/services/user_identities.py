"""Phase I mirror of login identities. Authentication still reads `users`."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Connection


class IdentityBackfillAborted(RuntimeError):
    """Legacy users rows are not safe to copy. No identity rows were inserted."""


def backfill_user_identities(connection: Connection) -> None:
    """Copy `users.email` / `users.oauth_google_sub` into `user_identities`.

    Idempotent. Does not change phone, password, role, or status.
    A later run promotes an email row to google when that same user gained a sub,
    instead of inserting a second row for the same address.
    """
    _abort_if_legacy_inconsistent(connection)
    _promote_email_rows_that_gained_google(connection)
    _insert_missing_identities(connection)


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
              ) AS blank_subs
            """
        )
    ).one()
    duplicate_emails = int(row.duplicate_emails)
    duplicate_subs = int(row.duplicate_subs)
    blank_subs = int(row.blank_subs)
    if duplicate_emails or duplicate_subs or blank_subs:
        raise IdentityBackfillAborted(
            "user_identities backfill aborted: "
            f"duplicate_emails={duplicate_emails} "
            f"duplicate_google_subs={duplicate_subs} "
            f"blank_google_subs={blank_subs}"
        )


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
