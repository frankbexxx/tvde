from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.driver import Driver
    from app.db.models.partner import Partner
    from app.db.models.vehicle_document import VehicleDocument


class Vehicle(Base):
    """Fleet vehicle owned by a partner (PARTNER-FLEET-2A)."""

    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Vehicle identifier.",
    )
    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("partners.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Fleet / organization that owns this vehicle.",
    )
    plate: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Display plate as entered (trimmed).",
    )
    plate_normalized: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        unique=True,
        comment="Normalized plate for global uniqueness (upper, no spaces/hyphens).",
    )
    make: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    service_categories: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default="x",
        comment="CSV of service categories (same codes as drivers.vehicle_categories); metadata only.",
    )
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        server_default="active",
        comment="active | inactive",
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

    partner: Mapped["Partner"] = relationship(back_populates="vehicles")
    assigned_driver: Mapped[Optional["Driver"]] = relationship(
        back_populates="active_vehicle",
        uselist=False,
        foreign_keys="Driver.active_vehicle_id",
    )
    documents: Mapped[List["VehicleDocument"]] = relationship(
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
