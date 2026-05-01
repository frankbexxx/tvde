from __future__ import annotations

import uuid
from datetime import date
from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DriverZoneDayBudget(Base):
    """Daily budget for «mudanças de zona» (v1)."""

    __tablename__ = "driver_zone_day_budgets"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    service_date: Mapped[date] = mapped_column(Date(), primary_key=True)
    used_changes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    max_changes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")
    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="Europe/Lisbon",
        server_default="Europe/Lisbon",
    )
