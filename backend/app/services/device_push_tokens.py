"""FCM device tokens. The token string is never written to logs or audit."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.device_push_token import DevicePushToken
from app.db.models.user import User
from app.models.enums import UserStatus

PLATFORM_ANDROID = "android"
ALLOWED_PLATFORMS = frozenset({PLATFORM_ANDROID})
TRIPS_CHANNEL_ID = "trips"


def register_device_token(
    db: Session,
    *,
    user_id: uuid.UUID,
    token: str,
    platform: str,
) -> DevicePushToken:
    """Upsert by global token. The same install moves to the current user."""
    now = datetime.now(timezone.utc)
    row = db.execute(
        select(DevicePushToken).where(DevicePushToken.token == token)
    ).scalar_one_or_none()
    if row is None:
        row = DevicePushToken(
            user_id=user_id,
            token=token,
            platform=platform,
            active=True,
            last_seen_at=now,
        )
        db.add(row)
    else:
        row.user_id = user_id
        row.platform = platform
        row.active = True
        row.last_seen_at = now
    db.commit()
    db.refresh(row)
    return row


def unregister_device_token(
    db: Session,
    *,
    user_id: uuid.UUID,
    token: str,
) -> DevicePushToken | None:
    """Deactivate only a token that belongs to this user. The row stays."""
    row = db.execute(
        select(DevicePushToken).where(
            DevicePushToken.token == token,
            DevicePushToken.user_id == user_id,
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    row.active = False
    row.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def deactivate_token_value(db: Session, token: str) -> None:
    row = db.execute(
        select(DevicePushToken).where(DevicePushToken.token == token)
    ).scalar_one_or_none()
    if row is None or not row.active:
        return
    row.active = False
    row.last_seen_at = datetime.now(timezone.utc)
    db.commit()


def active_tokens_for_user(db: Session, user: User) -> list[DevicePushToken]:
    """Blocked accounts are not eligible. Their tokens are turned off."""
    rows = list(
        db.execute(
            select(DevicePushToken).where(
                DevicePushToken.user_id == user.id,
                DevicePushToken.active.is_(True),
            )
        ).scalars()
    )
    if user.status != UserStatus.active:
        changed = False
        for row in rows:
            row.active = False
            row.last_seen_at = datetime.now(timezone.utc)
            changed = True
        if changed:
            db.commit()
        return []
    return rows
