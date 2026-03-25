from __future__ import annotations
# ruff: noqa: F821  # SQLAlchemy forward refs in Mapped["..."] are valid

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TripStatus

if TYPE_CHECKING:
    from app.db.models.driver import Driver
    from app.db.models.payment import Payment
    from app.db.models.trip_offer import TripOffer
    from app.db.models.user import User


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique trip identifier.",
    )
    passenger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Passenger user identifier.",
    )
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="Assigned driver identifier (nullable until accepted).",
    )
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, name="trip_status_enum"),
        nullable=False,
        comment="Lifecycle status of the trip.",
    )
    origin_lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Origin latitude.",
    )
    origin_lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Origin longitude.",
    )
    destination_lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Destination latitude.",
    )
    destination_lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Destination longitude.",
    )
    estimated_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Estimated price at request time.",
    )
    distance_km: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="Trip distance in km (null until known or mocked).",
    )
    duration_min: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="Trip duration in minutes (null until known or mocked).",
    )
    final_price: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Final price after completion.",
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the trip was started by the driver.",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the trip was marked as completed.",
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
        comment="Updated on state transitions or price updates.",
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        String(280),
        nullable=True,
        comment="Reason for cancellation, when cancelled.",
    )
    cancellation_fee: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Fee charged when passenger cancels after driver accepted.",
    )
    cancelled_by: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
        comment="Who cancelled: passenger, driver, admin.",
    )
    driver_rating: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Passenger's rating of driver (1-5), set after completion.",
    )
    passenger_rating: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Driver's rating of passenger (1-5), set after completion.",
    )

    passenger: Mapped["User"] = relationship(
        back_populates="passenger_trips",
        foreign_keys=[passenger_id],
    )
    driver: Mapped[Optional["Driver"]] = relationship(
        back_populates="trips",
        foreign_keys=[driver_id],
    )
    payment: Mapped[Optional["Payment"]] = relationship(
        back_populates="trip",
        uselist=False,
    )
    offers: Mapped[List["TripOffer"]] = relationship(
        back_populates="trip",
    )


Index("ix_trips_status", Trip.status)
Index("ix_trips_passenger_id", Trip.passenger_id)
Index("ix_trips_driver_id", Trip.driver_id)

