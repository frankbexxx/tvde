from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.user import User


class UserIdentity(Base):
    """Login identity mirror. Phase I does not authenticate against this table."""

    __tablename__ = "user_identities"
    __table_args__ = (
        CheckConstraint(
            "provider IN ('email', 'google')",
            name="ck_user_identities_provider",
        ),
        CheckConstraint(
            "("
            "provider = 'google' "
            "AND provider_subject IS NOT NULL "
            "AND btrim(provider_subject) <> ''"
            ") OR ("
            "provider = 'email' "
            "AND email IS NOT NULL "
            "AND btrim(email) <> '' "
            "AND provider_subject IS NULL"
            ")",
            name="ck_user_identities_provider_shape",
        ),
        CheckConstraint(
            "email IS NULL OR ("
            "email = lower(email) AND email = btrim(email) AND email <> ''"
            ")",
            name="ck_user_identities_email_normalized",
        ),
        CheckConstraint(
            "revoked_at IS NULL OR is_primary = false",
            name="ck_user_identities_revoked_not_primary",
        ),
        Index(
            "uq_user_identities_email",
            text("lower(email)"),
            unique=True,
            postgresql_where=text("email IS NOT NULL"),
        ),
        Index(
            "uq_user_identities_provider_subject",
            "provider",
            "provider_subject",
            unique=True,
            postgresql_where=text("provider_subject IS NOT NULL"),
        ),
        Index(
            "uq_user_identities_one_primary",
            "user_id",
            unique=True,
            postgresql_where=text("is_primary AND revoked_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_subject: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(back_populates="identities")
