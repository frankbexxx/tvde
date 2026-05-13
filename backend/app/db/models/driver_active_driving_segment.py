from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.driver import Driver
    from app.db.models.trip import Trip


class DriverActiveDrivingSegment(Base):
    """
    Tempo em condução activa (arriving + ongoing) por viagem.
    Um segmento abre em accepted→arriving e fecha ao sair de arriving/ongoing.
    """

    __tablename__ = "driver_active_driving_segments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    driver: Mapped["Driver"] = relationship(back_populates="active_driving_segments")
    trip: Mapped["Trip"] = relationship(back_populates="active_driving_segments")

    __table_args__ = (Index("ix_driver_active_driving_segments_driver_id", "driver_id"),)
