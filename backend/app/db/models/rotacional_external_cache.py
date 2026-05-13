"""Single-row cache for rotacional v3 (HTTP-fetched items, merged in GET /rotacional/messages)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CACHE_ROW_ID = 1


class RotacionalExternalCache(Base):
    __tablename__ = "rotacional_external_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=CACHE_ROW_ID)
    items_json: Mapped[str] = mapped_column(Text, nullable=False, server_default="[]")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
