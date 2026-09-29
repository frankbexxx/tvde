"""Phase I: user_identities mirror. Login still reads users."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.db.session import engine
from app.models.enums import Role, UserStatus
from app.services.user_identities import (
    IdentityBackfillAborted,
    backfill_user_identities,
)
from tests.support.unique_phone import unique_test_phone

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
REV_BEFORE = "a2b3c4d5e6f7"
REV_IDENTITIES = "b3c4d5e6f7a8"


def _alembic_cfg() -> Config:
    return Config(str(ALEMBIC_INI))


def _add_user(
    db: Session,
    *,
    role: Role = Role.passenger,
    status: UserStatus = UserStatus.active,
    email: str | None = None,
    sub: str | None = None,
    password: str = "unchanged-secret",
) -> User:
    user = User(
        role=role,
        name="Identity",
        phone=unique_test_phone(),
        status=status,
        email=email,
        oauth_google_sub=sub,
        password_hash=hash_password(password),
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


def _expect_rejected(db: Session) -> None:
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def _rows_for(db: Session, user_id: uuid.UUID) -> list[UserIdentity]:
    return list(
        db.execute(
            select(UserIdentity).where(UserIdentity.user_id == user_id)
        ).scalars()
    )


def test_user_identities_table_exists(db: Session) -> None:
    name = db.execute(text("SELECT to_regclass('public.user_identities')")).scalar()
    assert name == "user_identities"


def test_backfill_email_and_sub_creates_one_google_row(db: Session) -> None:
    email = f"both-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(db, email=email, sub=sub)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        rows = _rows_for(db, user.id)
        assert len(rows) == 1
        row = rows[0]
        assert row.provider == "google"
        assert row.provider_subject == sub
        assert row.email == email
        assert row.is_primary is True
        assert row.is_verified is True
        assert row.revoked_at is None
    finally:
        _delete_user(db, user.id)


def test_backfill_email_without_sub_creates_email_row(db: Session) -> None:
    email = f"mail-{uuid.uuid4().hex}@example.com"
    user = _add_user(db, email=f"  {email.upper()}  ")
    try:
        backfill_user_identities(db.connection())
        db.commit()
        rows = _rows_for(db, user.id)
        assert len(rows) == 1
        assert rows[0].provider == "email"
        assert rows[0].email == email
        assert rows[0].provider_subject is None
        assert rows[0].is_primary is True
    finally:
        _delete_user(db, user.id)


def test_backfill_without_email_or_sub_creates_nothing(db: Session) -> None:
    user = _add_user(db, email="   ", sub=None)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        assert _rows_for(db, user.id) == []
    finally:
        _delete_user(db, user.id)


def test_backfill_repeated_keeps_the_same_count(db: Session) -> None:
    user = _add_user(
        db,
        email=f"repeat-{uuid.uuid4().hex}@example.com",
        sub=f"sub-{uuid.uuid4().hex}",
    )
    try:
        backfill_user_identities(db.connection())
        db.commit()
        backfill_user_identities(db.connection())
        db.commit()
        assert len(_rows_for(db, user.id)) == 1
    finally:
        _delete_user(db, user.id)


def test_same_user_accepts_a_second_non_primary_email(db: Session) -> None:
    user = _add_user(db, email=f"primary-{uuid.uuid4().hex}@example.com")
    try:
        backfill_user_identities(db.connection())
        db.commit()
        extra = f"extra-{uuid.uuid4().hex}@example.com"
        db.add(
            UserIdentity(
                user_id=user.id,
                provider="email",
                email=extra,
                provider_subject=None,
                is_primary=False,
                is_verified=True,
            )
        )
        db.commit()
        rows = _rows_for(db, user.id)
        assert len(rows) == 2
        assert sum(1 for row in rows if row.is_primary) == 1
    finally:
        _delete_user(db, user.id)


def test_same_email_on_another_user_fails(db: Session) -> None:
    email = f"taken-{uuid.uuid4().hex}@example.com"
    owner = _add_user(db, email=email)
    other = _add_user(db)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        db.add(
            UserIdentity(
                user_id=other.id,
                provider="email",
                email=email,
                is_primary=False,
                is_verified=True,
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, owner.id)
        _delete_user(db, other.id)


def test_revoked_email_cannot_be_reused_by_another_user(db: Session) -> None:
    email = f"revoked-mail-{uuid.uuid4().hex}@example.com"
    owner = _add_user(db, email=email)
    other = _add_user(db)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        row = _rows_for(db, owner.id)[0]
        row.is_primary = False
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.add(
            UserIdentity(
                user_id=other.id,
                provider="email",
                email=email,
                is_primary=True,
                is_verified=True,
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, owner.id)
        _delete_user(db, other.id)


def test_same_google_sub_on_another_user_fails(db: Session) -> None:
    sub = f"sub-{uuid.uuid4().hex}"
    owner = _add_user(db, email=f"g-{uuid.uuid4().hex}@example.com", sub=sub)
    other = _add_user(db)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        db.add(
            UserIdentity(
                user_id=other.id,
                provider="google",
                email=f"other-{uuid.uuid4().hex}@example.com",
                provider_subject=sub,
                is_primary=False,
                is_verified=True,
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, owner.id)
        _delete_user(db, other.id)


def test_revoked_google_sub_cannot_be_reused_by_another_user(db: Session) -> None:
    sub = f"sub-{uuid.uuid4().hex}"
    owner = _add_user(db, sub=sub)
    other = _add_user(db)
    try:
        backfill_user_identities(db.connection())
        db.commit()
        row = _rows_for(db, owner.id)[0]
        row.is_primary = False
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.add(
            UserIdentity(
                user_id=other.id,
                provider="google",
                email=None,
                provider_subject=sub,
                is_primary=True,
                is_verified=True,
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, owner.id)
        _delete_user(db, other.id)


def test_two_active_primaries_on_the_same_user_fail(db: Session) -> None:
    user = _add_user(db, email=f"one-{uuid.uuid4().hex}@example.com")
    try:
        backfill_user_identities(db.connection())
        db.commit()
        db.add(
            UserIdentity(
                user_id=user.id,
                provider="email",
                email=f"two-{uuid.uuid4().hex}@example.com",
                is_primary=True,
                is_verified=True,
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, user.id)


def test_revoked_identity_cannot_stay_primary(db: Session) -> None:
    user = _add_user(db)
    try:
        db.add(
            UserIdentity(
                user_id=user.id,
                provider="google",
                email=None,
                provider_subject=f"sub-{uuid.uuid4().hex}",
                is_primary=True,
                is_verified=True,
                revoked_at=datetime.now(timezone.utc),
            )
        )
        _expect_rejected(db)
    finally:
        _delete_user(db, user.id)


def test_revoked_identity_does_not_count_as_active_primary(db: Session) -> None:
    user = _add_user(db, email=f"was-primary-{uuid.uuid4().hex}@example.com")
    try:
        backfill_user_identities(db.connection())
        db.commit()
        row = _rows_for(db, user.id)[0]
        row.is_primary = False
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.add(
            UserIdentity(
                user_id=user.id,
                provider="email",
                email=f"next-primary-{uuid.uuid4().hex}@example.com",
                is_primary=True,
                is_verified=True,
            )
        )
        db.commit()
        active = db.execute(
            select(func.count())
            .select_from(UserIdentity)
            .where(
                UserIdentity.user_id == user.id,
                UserIdentity.is_primary.is_(True),
                UserIdentity.revoked_at.is_(None),
            )
        ).scalar_one()
        assert active == 1
        revoked = _rows_for(db, user.id)
        assert any(item.revoked_at is not None and item.is_primary is False for item in revoked)
    finally:
        _delete_user(db, user.id)


def test_downgrade_drops_table_and_keeps_legacy_user_columns(db: Session) -> None:
    email = f"legacy-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(db, email=email, sub=sub)
    user_id = user.id
    cfg = _alembic_cfg()
    try:
        backfill_user_identities(db.connection())
        db.commit()
        db.close()
        command.downgrade(cfg, REV_BEFORE)
        with engine.connect() as conn:
            assert conn.execute(
                text("SELECT to_regclass('public.user_identities')")
            ).scalar() is None
            legacy = conn.execute(
                text("SELECT email, oauth_google_sub FROM users WHERE id = :id"),
                {"id": user_id},
            ).one()
            assert legacy.email == email
            assert legacy.oauth_google_sub == sub
    finally:
        command.upgrade(cfg, "head")
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})


def test_pending_passenger_keeps_its_own_user_id(db: Session) -> None:
    email = f"pending-{uuid.uuid4().hex}@example.com"
    sub = f"sub-{uuid.uuid4().hex}"
    user = _add_user(
        db,
        status=UserStatus.pending,
        email=email,
        sub=sub,
    )
    try:
        backfill_user_identities(db.connection())
        db.commit()
        rows = _rows_for(db, user.id)
        assert len(rows) == 1
        assert rows[0].user_id == user.id
        assert user.status == UserStatus.pending
    finally:
        _delete_user(db, user.id)


def test_pending_google_user_is_not_merged_into_super_admin(db: Session) -> None:
    """Same shape as the partial account and the existing super_admin: two users."""
    staff = _add_user(
        db,
        role=Role.super_admin,
        email=f"staff-{uuid.uuid4().hex}@example.com",
        sub=f"sub-staff-{uuid.uuid4().hex}",
    )
    pending = _add_user(
        db,
        status=UserStatus.pending,
        email=f"partial-{uuid.uuid4().hex}@example.com",
        sub=f"sub-partial-{uuid.uuid4().hex}",
    )
    try:
        backfill_user_identities(db.connection())
        db.commit()
        staff_rows = _rows_for(db, staff.id)
        pending_rows = _rows_for(db, pending.id)
        assert len(staff_rows) == 1
        assert len(pending_rows) == 1
        assert staff_rows[0].user_id == staff.id
        assert pending_rows[0].user_id == pending.id
        assert staff_rows[0].provider_subject != pending_rows[0].provider_subject
        assert staff_rows[0].email != pending_rows[0].email
    finally:
        _delete_user(db, staff.id)
        _delete_user(db, pending.id)


def test_backfill_does_not_change_role_status_phone_or_password(db: Session) -> None:
    user = _add_user(
        db,
        role=Role.driver,
        email=f"keep-{uuid.uuid4().hex}@example.com",
        sub=f"sub-{uuid.uuid4().hex}",
        password="keep-this-secret",
    )
    before = (
        user.role,
        user.status,
        user.phone,
        user.password_hash,
        user.email,
        user.oauth_google_sub,
    )
    try:
        backfill_user_identities(db.connection())
        db.commit()
        db.refresh(user)
        assert (
            user.role,
            user.status,
            user.phone,
            user.password_hash,
            user.email,
            user.oauth_google_sub,
        ) == before
    finally:
        _delete_user(db, user.id)


def test_blank_google_sub_aborts_without_insert(db: Session) -> None:
    user = _add_user(db, sub="   ")
    try:
        with pytest.raises(IdentityBackfillAborted):
            backfill_user_identities(db.connection())
        db.rollback()
        assert _rows_for(db, user.id) == []
    finally:
        _delete_user(db, user.id)


def test_current_revision_is_user_identities(db: Session) -> None:
    revision = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert revision == REV_IDENTITIES
