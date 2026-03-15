"""Structured logging helper for TVDE backend."""
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("tvde")


def log_event(event_name: str, **fields) -> None:
    """Log a structured event. Fields are serialized as JSON-compatible values."""
    payload = {
        "event": event_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **fields,
    }
    # Serialize UUIDs and enums to strings for JSON compatibility
    serialized = {}
    for k, v in payload.items():
        if hasattr(v, "hex"):  # UUID
            serialized[k] = str(v)
        elif hasattr(v, "value"):  # Enum
            serialized[k] = v.value if v is not None else None
        else:
            serialized[k] = v
    logger.info(json.dumps(serialized, default=str))
