import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique audit event identifier.",
    )
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Event type identifier.",
    )
    entity_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Entity type (e.g., trip).",
    )
    entity_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Entity identifier as string.",
    )
    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="Serialized event payload.",
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when event occurred.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Persistence timestamp.",
    )


Index("ix_audit_events_entity", AuditEvent.entity_type, AuditEvent.entity_id)
Index("ix_audit_events_occurred_at", AuditEvent.occurred_at)

