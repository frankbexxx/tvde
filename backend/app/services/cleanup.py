"""Cleanup tasks for cron (D001)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.utils.logging import log_event

logger = logging.getLogger(__name__)


def run_cleanup(db: Session) -> dict[str, int]:
    """
    Delete old audit_events. Returns counts of deleted rows.
    """
    retention_days = getattr(settings, "AUDIT_EVENTS_RETENTION_DAYS", 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    result = db.execute(delete(AuditEvent).where(AuditEvent.occurred_at < cutoff))
    deleted = (result.rowcount if hasattr(result, "rowcount") else 0) or 0
    if deleted > 0:
        db.commit()
        logger.info("cleanup: deleted %d audit_events older than %s days", deleted, retention_days)
        log_event(
            "cron_cleanup_audit_events",
            deleted_count=deleted,
            retention_days=retention_days,
        )
    return {"audit_events_deleted": deleted}
