from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DriverZoneSession(Base):
    """Single «mudança de zona» intent (v1). Consumption on first completed trip in zone — later hook."""

    __tablename__ = "driver_zone_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    zone_id: Mapped[str] = mapped_column(String(128), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eta_seconds_baseline: Mapped[int] = mapped_column(Integer, nullable=False)
    eta_margin_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=25, server_default="25")
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_completed_trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )
    first_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    consume_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", server_default="open")
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extension_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    extension_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extension_seconds_approved: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    approved_by_partner_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
