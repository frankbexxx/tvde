"""Interaction log for behavioural telemetry — observação passiva, sem impacto no fluxo."""

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InteractionLog(Base):
    """Eventos essenciais: quem clicou, o que aconteceu, quanto tempo, estado resultante."""

    __tablename__ = "interaction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # passenger | driver
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    trip_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    previous_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_status: Mapped[str | None] = mapped_column(String(32), nullable=True)


Index("ix_interaction_logs_timestamp", InteractionLog.timestamp)
Index("ix_interaction_logs_trip_id", InteractionLog.trip_id)
