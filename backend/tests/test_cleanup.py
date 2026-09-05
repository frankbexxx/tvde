"""D001: Cleanup tests — AuditEvent retention (M2 provisional 730d)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import select

from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.services.cleanup import run_cleanup


def _add_event(db, *, occurred_at: datetime, entity_id: str = "trip-123") -> AuditEvent:
    evt = AuditEvent(
        event_type="test",
        entity_type="trip",
        entity_id=entity_id,
        payload={},
        occurred_at=occurred_at,
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)
    return evt


def test_audit_events_retention_default_is_730() -> None:
    assert settings.AUDIT_EVENTS_RETENTION_DAYS == 730


def test_cleanup_keeps_events_younger_than_retention(db) -> None:
    """Events younger than retention (e.g. 100d with default 730) are kept."""
    young = datetime.now(timezone.utc) - timedelta(days=100)
    evt = _add_event(db, occurred_at=young, entity_id="keep-young")
    evt_id = evt.id

    result = run_cleanup(db)
    assert result.get("audit_events_deleted", 0) == 0
    remaining = db.execute(
        select(AuditEvent).where(AuditEvent.id == evt_id)
    ).scalar_one_or_none()
    assert remaining is not None


def test_cleanup_keeps_event_at_exact_cutoff_boundary(db) -> None:
    """Boundary: occurred_at == cutoff is kept (delete uses strict <)."""
    retention = settings.AUDIT_EVENTS_RETENTION_DAYS
    fixed_now = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
    cutoff = fixed_now - timedelta(days=retention)
    evt = _add_event(db, occurred_at=cutoff, entity_id="keep-boundary")
    evt_id = evt.id

    with patch("app.services.cleanup.datetime") as mock_dt:
        mock_dt.now.return_value = fixed_now
        result = run_cleanup(db)

    assert result.get("audit_events_deleted", 0) == 0
    remaining = db.execute(
        select(AuditEvent).where(AuditEvent.id == evt_id)
    ).scalar_one_or_none()
    assert remaining is not None


def test_cleanup_deletes_events_older_than_retention(db) -> None:
    """Events older than retention are deleted."""
    retention = settings.AUDIT_EVENTS_RETENTION_DAYS
    old = datetime.now(timezone.utc) - timedelta(days=retention + 1)
    evt = _add_event(db, occurred_at=old, entity_id="delete-old")
    evt_id = evt.id

    result = run_cleanup(db)
    assert result.get("audit_events_deleted", 0) >= 1
    remaining = db.execute(
        select(AuditEvent).where(AuditEvent.id == evt_id)
    ).scalar_one_or_none()
    assert remaining is None


def test_cleanup_respects_explicit_override(db) -> None:
    """Explicit shorter retention still deletes events past that window."""
    old_for_90 = datetime.now(timezone.utc) - timedelta(days=100)
    evt = _add_event(db, occurred_at=old_for_90, entity_id="override-90")
    evt_id = evt.id

    with patch.object(settings, "AUDIT_EVENTS_RETENTION_DAYS", 90):
        result = run_cleanup(db)

    assert result.get("audit_events_deleted", 0) >= 1
    remaining = db.execute(
        select(AuditEvent).where(AuditEvent.id == evt_id)
    ).scalar_one_or_none()
    assert remaining is None
