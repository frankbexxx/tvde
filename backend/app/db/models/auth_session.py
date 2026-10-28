"""Famílias de sessão e refresh tokens opacos (G2-AUTH-1).

O segredo do refresh não é coluna. A linha guarda o hash. O sucessor em claro
só existe, cifrado, durante a janela de repetição.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, LargeBinary, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuthSessionFamily(Base):
    __tablename__ = "auth_session_families"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    client_type: Mapped[str] = mapped_column(String(16), nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    absolute_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoke_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    __table_args__ = (
        Index("ix_auth_session_families_user_id", "user_id"),
    )


class AuthRefreshToken(Base):
    __tablename__ = "auth_refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth_session_families.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    generation: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    idle_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    rotated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    idempotency_key_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    successor_ciphertext: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    successor_retain_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    replaced_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth_refresh_tokens.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_auth_refresh_tokens_family_id", "family_id"),
        Index(
            "uq_auth_refresh_tokens_family_generation",
            "family_id",
            "generation",
            unique=True,
        ),
        Index(
            "uq_auth_refresh_tokens_one_active",
            "family_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
        Index(
            "ix_auth_refresh_tokens_successor_retain",
            "successor_retain_until",
            postgresql_where=text("successor_ciphertext IS NOT NULL"),
        ),
    )
