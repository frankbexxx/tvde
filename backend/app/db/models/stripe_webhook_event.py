"""Stripe webhook delivery idempotency (evt_*), PostgreSQL."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StripeWebhookEvent(Base):
    """One row per processed Stripe event id — duplicate deliveries return 200 without re-applying."""

    __tablename__ = "stripe_webhook_events"

    stripe_event_id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        comment="Stripe event id (evt_ prefix).",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="First time this event was recorded.",
    )
