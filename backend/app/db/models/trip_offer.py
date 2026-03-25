"""Trip offer: driver receives offer for a requested trip."""

from __future__ import annotations
# ruff: noqa: F821  # SQLAlchemy forward refs in Mapped["..."] are valid

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import OfferStatus

if TYPE_CHECKING:
    from app.db.models.driver import Driver
    from app.db.models.trip import Trip


class TripOffer(Base):
    """Offer sent to a driver for a requested trip. First accept wins."""

    __tablename__ = "trip_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique offer identifier.",
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        comment="Trip this offer is for.",
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="CASCADE"),
        nullable=False,
        comment="Driver who received this offer.",
    )
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus, name="offer_status_enum"),
        nullable=False,
        default=OfferStatus.pending,
        server_default="pending",
        comment="Offer status.",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="When the offer expires.",
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
        comment="Updated on status change.",
    )

    trip: Mapped["Trip"] = relationship(back_populates="offers")
    driver: Mapped["Driver"] = relationship(back_populates="offers")
