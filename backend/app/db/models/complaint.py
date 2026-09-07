"""L-12 Complaint foundation — case state + canonical procedure history.

L-25: external / LRE / RAL import fields (nullable contact snapshots).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Complaint(Base):
    """Canonical current state of a platform complaint (L-12 / L-25)."""

    __tablename__ = "complaints"
    __table_args__ = (
        Index(
            "uq_complaints_source_external_reference",
            "source",
            "external_reference",
            unique=True,
            postgresql_where=text("external_reference IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Internal complaint id.",
    )
    public_reference: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        unique=True,
        comment="Public reference CMP-YYYY-XXXXXXXX.",
    )
    complainant_role: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="passenger | driver | external",
    )
    complainant_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="User who submitted (nullable for external/LRE import).",
    )
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Optional related trip.",
    )
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Controlled category.",
    )
    description: Mapped[str] = mapped_column(
        Text(),
        nullable=False,
        comment="Complaint description (canonical PII text).",
    )
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="in_app",
        comment="Origin channel: in_app | livro_reclamacoes | ral | other.",
    )
    external_reference: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        comment="Official external reference (e.g. LRE) when available.",
    )
    external_response_due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Admin-set external response deadline (no auto business-day calc).",
    )
    external_responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When external response was recorded (operational).",
    )
    complainant_name: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="External complainant name snapshot.",
    )
    complainant_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="External complainant email snapshot.",
    )
    complainant_phone: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="External complainant phone snapshot.",
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Complaint submission time (retention clock).",
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="received",
        index=True,
        comment="Current workflow status.",
    )
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin assignee (internal).",
    )
    resolution: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True,
        comment="Latest resolution text; active only when status resolved|closed.",
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Set when entering resolved; cleared on reopen.",
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Set when entering closed.",
    )
    retention_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="submitted_at + 2 calendar years (backend-computed).",
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


class ComplaintHistory(Base):
    """Canonical procedure trail for L-12 (independent of AuditEvent retention)."""

    __tablename__ = "complaint_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="received|status_changed|resolved|reopened|closed|assignment_changed",
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    event_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "metadata",
        JSONB,
        nullable=True,
        comment="Minimal non-PII metadata.",
    )


Index(
    "ix_complaint_history_complaint_occurred",
    ComplaintHistory.complaint_id,
    ComplaintHistory.occurred_at,
)
