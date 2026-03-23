from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Protocol

from app.db.models.audit_event import AuditEvent
from app.db.session import SessionLocal
from app.realtime.admin_hub import admin_hub
from app.realtime.hub import hub
from app.schemas.realtime import TripStatusChangedEvent

logger = logging.getLogger(__name__)


class EventProtocol(Protocol):
    event: str

    def model_dump(self) -> dict: ...


def _event_to_audit_payload(event: EventProtocol) -> dict:
    # Ensure JSON-serializable payload for JSONB.
    return event.model_dump()


def _event_occurred_at(event: EventProtocol) -> datetime:
    timestamp = getattr(event, "timestamp", None)
    if isinstance(timestamp, datetime):
        return timestamp
    return datetime.now(timezone.utc)


def _event_entity(event: EventProtocol) -> tuple[str, str]:
    if isinstance(event, TripStatusChangedEvent):
        return "trip", event.trip_id
    return "unknown", "unknown"


def emit(event: EventProtocol) -> None:
    try:
        entity_type, entity_id = _event_entity(event)
        payload = _event_to_audit_payload(event)
        occurred_at = _event_occurred_at(event)

        with SessionLocal() as db:
            audit_event = AuditEvent(
                event_type=event.event,
                entity_type=entity_type,
                entity_id=str(entity_id),
                payload=payload,
                occurred_at=occurred_at,
            )
            db.add(audit_event)
            db.commit()
    except Exception:
        logger.exception("Failed to persist audit event")
        return

    try:
        if isinstance(event, TripStatusChangedEvent):
            hub.publish(event)
            admin_hub.publish(event)
    except Exception:
        logger.exception("Failed to publish realtime event")
        return

