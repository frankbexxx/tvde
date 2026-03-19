"""Structured logging helper for TVDE backend.

A007: Human-readable console output, trip_id in all logs, optional in-memory buffer.
"""
import logging
import sys
from collections import defaultdict
from threading import Lock

logger = logging.getLogger("tvde")

# A007: Ensure tvde logs to stdout (visible in console during tests/run)
if not logger.handlers:
    logger.setLevel(logging.INFO)
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_h)

# In-memory buffer: last 50 events per trip_id (no persistence)
MAX_EVENTS_PER_TRIP = 50
_recent_trip_logs: dict[str, list[str]] = defaultdict(list)
_buffer_lock = Lock()


def _serialize_value(v: object) -> str:
    """Convert value to string for display."""
    if hasattr(v, "hex"):  # UUID
        return str(v)
    if hasattr(v, "value"):  # Enum
        return str(v.value) if v is not None else "null"
    return str(v)


def _format_human_readable(event_name: str, **fields) -> str:
    """Build human-readable log line: [PREFIX] event | key=value | key=value"""
    prefix_map = {
        "trip_created": "TRIP",
        "trip_accepted": "TRIP",
        "trip_state_change": "TRIP",
        "offer_sent": "DISPATCH",
        "offer_accepted": "DRIVER",
        "driver_location_update": "DRIVER",
        "driver_location_first_send": "DRIVER",
        "driver_location_updated": "DRIVER",
        "driver_location_requested": "DRIVER",
        "stale_location_filtered": "DISPATCH",
        "NO_READY_DRIVERS_AT_DISPATCH": "DISPATCH",
        "dispatch_retry_attempt": "DISPATCH",
        "dispatch_retry_success": "DISPATCH",
        "dispatch_retry_failed": "DISPATCH",
        "trip_auto_dispatched": "DISPATCH",
    }
    prefix = prefix_map.get(event_name, "TVDE")

    parts = []
    if "trip_id" in fields and fields["trip_id"] is not None:
        parts.append(f"trip_id={_serialize_value(fields['trip_id'])}")

    if event_name == "trip_state_change":
        from_val = fields.get("from") or fields.get("from_state")
        to_val = fields.get("to") or fields.get("to_state")
        from_str = _serialize_value(from_val) if from_val is not None else "?"
        to_str = _serialize_value(to_val) if to_val is not None else "?"
        parts.append(f"{from_str} → {to_str}")
        msg = "state_changed | " + " | ".join(parts)
    else:
        for k, v in fields.items():
            if k in ("from_state", "to_state", "from", "to", "trip_id"):
                continue
            if v is not None:
                parts.append(f"{k}={_serialize_value(v)}")
        msg = f"{event_name} | " + " | ".join(parts) if parts else event_name

    return f"[{prefix}] {msg}"


def _append_to_buffer(trip_id: str | None, line: str) -> None:
    """Append event to in-memory buffer for trip (max 50 per trip)."""
    if not trip_id:
        return
    with _buffer_lock:
        lst = _recent_trip_logs[trip_id]
        lst.append(line)
        if len(lst) > MAX_EVENTS_PER_TRIP:
            _recent_trip_logs[trip_id] = lst[-MAX_EVENTS_PER_TRIP:]


def get_recent_trip_logs(trip_id: str) -> list[str]:
    """Return recent log lines for a trip (from buffer)."""
    with _buffer_lock:
        return list(_recent_trip_logs.get(trip_id, []))


def log_event(event_name: str, **fields) -> None:
    """Log a structured event. Human-readable to console, trip_id for filtering."""
    human_line = _format_human_readable(event_name, **fields)
    logger.info(human_line)

    trip_id = fields.get("trip_id")
    if trip_id is not None:
        trip_id_str = _serialize_value(trip_id)
        _append_to_buffer(trip_id_str, human_line)


def log_debug_event(event_name: str, **fields) -> None:
    """Log only when DEBUG_RUNTIME_LOGS=True. Human-readable format."""
    try:
        from app.core.config import settings
        if not getattr(settings, "DEBUG_RUNTIME_LOGS", False):
            return
    except Exception:
        return
    human_line = _format_human_readable(event_name, **fields)
    logger.info(human_line)

    trip_id = fields.get("trip_id")
    if trip_id is not None:
        trip_id_str = _serialize_value(trip_id)
        _append_to_buffer(trip_id_str, human_line)
