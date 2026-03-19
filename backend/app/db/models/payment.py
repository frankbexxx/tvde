from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PaymentStatus


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("trip_id", name="uq_payments_trip_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique payment identifier.",
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        comment="Associated trip identifier.",
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Total charged amount.",
    )
    commission_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Platform commission amount.",
    )
    driver_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Driver share from authorization (legacy; driver_payout is final).",
    )
    driver_payout: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Final driver payout at completion (pricing engine). Future: deprecate driver_amount.",
    )
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="Stripe PaymentIntent identifier, when available.",
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="EUR",
        server_default="EUR",
        comment="ISO currency code (e.g., EUR).",
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        nullable=False,
        comment="Payment status.",
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
        comment="Updated on payment status changes.",
    )
    authorization_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Stripe authorization expiration timestamp, if available.",
    )

    trip: Mapped["Trip"] = relationship(back_populates="payment")

