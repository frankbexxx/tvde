"""Cleanup tasks for cron (D001)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.auth.refresh_sessions import purge_expired_successor_ciphertexts
from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.utils.logging import log_event

logger = logging.getLogger(__name__)


def run_cleanup(db: Session) -> dict[str, int]:
    """Apaga auditoria antiga e ciphertexts de refresh já fora do prazo."""
    retention_days = getattr(settings, "AUDIT_EVENTS_RETENTION_DAYS", 730)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    # Strict <: events exactly at cutoff are kept (deterministic boundary).
    result = db.execute(delete(AuditEvent).where(AuditEvent.occurred_at < cutoff))
    deleted = (result.rowcount if hasattr(result, "rowcount") else 0) or 0
    if deleted > 0:
        db.commit()
        logger.info(
            "cleanup: deleted %d audit_events older than %s days",
            deleted,
            retention_days,
        )
        log_event(
            "cron_cleanup_audit_events",
            deleted_count=deleted,
            retention_days=retention_days,
        )

    cleared = purge_expired_successor_ciphertexts(db)
    if cleared > 0:
        db.commit()
        logger.info(
            "cleanup: cleared %d expired refresh successor ciphertexts",
            cleared,
        )
        log_event("cron_cleanup_refresh_successors", cleared_count=cleared)
    return {
        "audit_events_deleted": deleted,
        "refresh_successors_cleared": cleared,
    }
