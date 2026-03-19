"""Structured logging helper for TVDE backend."""
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("tvde")


def _serialize_payload(event_name: str, **fields) -> dict:
    """Build JSON-serializable payload."""
    payload = {
        "event": event_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **fields,
    }
    serialized = {}
    for k, v in payload.items():
        if hasattr(v, "hex"):  # UUID
            serialized[k] = str(v)
        elif hasattr(v, "value"):  # Enum
            serialized[k] = v.value if v is not None else None
        else:
            serialized[k] = v
    return serialized


def log_event(event_name: str, **fields) -> None:
    """Log a structured event. Fields are serialized as JSON-compatible values."""
    serialized = _serialize_payload(event_name, **fields)
    logger.info(json.dumps(serialized, default=str))


def log_debug_event(event_name: str, **fields) -> None:
    """Log only when DEBUG_RUNTIME_LOGS=True. For real-user testing observability."""
    try:
        from app.core.config import settings
        if not getattr(settings, "DEBUG_RUNTIME_LOGS", False):
            return
    except Exception:
        return
    serialized = _serialize_payload(event_name, **fields)
    logger.info(json.dumps(serialized, default=str))
