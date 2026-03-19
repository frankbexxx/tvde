"""D001: Cleanup tests."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.models.audit_event import AuditEvent
from app.services.cleanup import run_cleanup


def test_cleanup_deletes_old_audit_events(db) -> None:
    """Cleanup deletes audit_events older than retention."""

    old_date = datetime.now(timezone.utc) - timedelta(days=100)
    evt = AuditEvent(
        event_type="test",
        entity_type="trip",
        entity_id="trip-123",
        payload={},
        occurred_at=old_date,
    )
    db.add(evt)
    db.commit()
    evt_id = evt.id

    result = run_cleanup(db)
    assert result.get("audit_events_deleted", 0) >= 1

    remaining = db.execute(select(AuditEvent).where(AuditEvent.id == evt_id)).scalar_one_or_none()
    assert remaining is None
