from __future__ import annotations

# ruff: noqa: F821  # SQLAlchemy forward refs in Mapped["..."] are valid

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DriverStatus

if TYPE_CHECKING:
    from app.db.models.partner import Partner
    from app.db.models.trip import Trip
    from app.db.models.trip_offer import TripOffer
    from app.db.models.user import User


class Driver(Base):
    __tablename__ = "drivers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="User identifier for the driver profile.",
    )
    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("partners.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Fleet / organization that owns this driver.",
    )
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus, name="driver_status_enum"),
        nullable=False,
        comment="Driver approval status.",
    )
    documents: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Document references or URLs.",
    )
    vehicle_categories: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Preferred vehicle categories for this driver (csv, ex: x,xl,pet).",
    )
    commission_percent: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        comment="Commission percentage for this driver.",
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="True when driver can accept new trips.",
    )
    cancellation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        server_default="0",
        comment="Number of trips cancelled by this driver (penalty tracking).",
    )
    avg_rating: Mapped[Optional[float]] = mapped_column(
        Numeric(3, 2),
        nullable=True,
        comment="Average rating from passengers (1-5).",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on approval or contract changes.",
    )

    user: Mapped["User"] = relationship(back_populates="driver_profile")
    partner: Mapped["Partner"] = relationship(back_populates="drivers")
    trips: Mapped[List["Trip"]] = relationship(back_populates="driver")
    offers: Mapped[List["TripOffer"]] = relationship(
        back_populates="driver",
    )
    last_location: Mapped[Optional["DriverLocation"]] = relationship(
        back_populates="driver",
        uselist=False,
    )


Index("ix_drivers_status", Driver.status)


class DriverLocation(Base):
    """
    Last known GPS location for a driver.
    One row per driver_id (primary key), updated frequently.
    """

    __tablename__ = "driver_locations"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="CASCADE"),
        primary_key=True,
        comment="Driver user_id (matches drivers.user_id).",
    )
    lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Last latitude reported by driver.",
    )
    lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Last longitude reported by driver.",
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of last location update.",
    )

    driver: Mapped["Driver"] = relationship(back_populates="last_location")


Index("ix_driver_locations_driver_id", DriverLocation.driver_id)
