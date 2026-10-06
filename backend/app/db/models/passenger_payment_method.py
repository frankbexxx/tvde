from __future__ import annotations

# ruff: noqa: F821

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.user import User


class PassengerPaymentMethod(Base):
    """Safe card metadata cache; Stripe is authority when STRIPE_MOCK=false."""

    __tablename__ = "passenger_payment_methods"
    __table_args__ = (
        UniqueConstraint(
            "stripe_payment_method_id",
            name="uq_passenger_payment_methods_stripe_pm",
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
    stripe_payment_method_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Stripe PaymentMethod id (pm_…).",
    )
    brand: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    last4: Mapped[str] = mapped_column(String(4), nullable=False, default="")
    exp_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    exp_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_default: Mapped[bool] = mapped_column(
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

    user: Mapped["User"] = relationship(back_populates="payment_methods")
