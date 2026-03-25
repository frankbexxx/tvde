"""Structured logging helper for TVDE backend.

A007: Human-readable console output, trip_id in all logs, buffer.
A008: Timeline format, trip headers, summary, operational focus.
"""
import logging
import sys
from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock

logger = logging.getLogger("tvde")

# A007: Ensure tvde logs to stdout (visible in console during tests/run)
if not logger.handlers:
    logger.setLevel(logging.INFO)
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_h)

# In-memory buffer: last 50 events per trip_id with timestamp for summary
MAX_EVENTS_PER_TRIP = 50
_recent_trip_logs: dict[str, list[dict]] = defaultdict(list)
_buffer_lock = Lock()

# ~50m = 0.05km threshold for "significant" location change
LOCATION_CHANGE_THRESHOLD_KM = 0.05

# A012: In ENV=test, skip console lines for these events (pytest readability).
_TEST_QUIET_EVENTS = frozenset({
    "offers_sent",
    "dispatch_retry_attempt",
    "dispatch_retry_success",
    "dispatch_retry_failed",
    "NO_READY_DRIVERS_AT_DISPATCH",
})


def _suppress_console_in_test(event_name: str) -> bool:
    try:
        from app.core.config import settings
        if getattr(settings, "ENV", "") != "test":
            return False
    except Exception:
        return False
    return event_name in _TEST_QUIET_EVENTS


def _log_state_arrow() -> str:
    """Unicode arrow breaks Windows cp1252 during pytest -s; ASCII in test only (A012)."""
    try:
        from app.core.config import settings
    except Exception:
        return "→"
    if getattr(settings, "ENV", "") == "test":
        return "->"
    return "→"


def _serialize_value(v: object) -> str:
    """Convert value to string for display."""
    if hasattr(v, "hex"):  # UUID
        return str(v)
    if hasattr(v, "value"):  # Enum
        return str(v.value) if v is not None else "null"
    return str(v)


def _time_prefix() -> str:
    """Return [HH:MM:SS] for timeline format."""
    return datetime.now(timezone.utc).strftime("[%H:%M:%S]")


def _format_human_readable(event_name: str, **fields) -> str:
    """Build human-readable log line: [PREFIX] event | key=value | key=value"""
    prefix_map = {
        "trip_created": "TRIP",
        "trip_accepted": "TRIP",
        "trip_state_change": "TRIP",
        "offers_sent": "DISPATCH",
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
        parts.append(f"{from_str} {_log_state_arrow()} {to_str}")
        msg = "state_changed | " + " | ".join(parts)
    else:
        for k, v in fields.items():
            if k in ("from_state", "to_state", "from", "to", "trip_id"):
                continue
            if v is not None:
                parts.append(f"{k}={_serialize_value(v)}")
        msg = f"{event_name} | " + " | ".join(parts) if parts else event_name

    return f"[{prefix}] {msg}"


def _append_to_buffer(
    trip_id: str | None,
    event_name: str,
    line: str,
    to_state: str | None = None,
    *,
    buffer_extra: dict | None = None,
) -> None:
    """Append event to in-memory buffer (max 50 per trip)."""
    if not trip_id:
        return
    now = datetime.now(timezone.utc)
    entry: dict = {"ts": now, "event": event_name, "line": line}
    if to_state is not None:
        entry["to_state"] = to_state
    if buffer_extra:
        entry.update(buffer_extra)
    with _buffer_lock:
        lst = _recent_trip_logs[trip_id]
        lst.append(entry)
        if len(lst) > MAX_EVENTS_PER_TRIP:
            _recent_trip_logs[trip_id] = lst[-MAX_EVENTS_PER_TRIP:]


def get_recent_trip_logs(trip_id: str) -> list[str]:
    """Return recent log lines for a trip (from buffer)."""
    with _buffer_lock:
        entries = _recent_trip_logs.get(trip_id, [])
        return [e["line"] for e in entries]


def _compute_trip_summary(trip_id: str) -> dict:
    """Compute time_to_assign, time_to_accept, time_to_start, total_duration, offers_sent."""
    with _buffer_lock:
        entries = list(_recent_trip_logs.get(trip_id, []))
    if not entries:
        return {"trip_id": trip_id, "events_count": 0}

    ts_created = None
    ts_assigned = None
    ts_accepted = None
    ts_ongoing = None
    ts_completed = None
    offers_sent = 0

    for e in entries:
        ev = e["event"]
        ts = e["ts"]
        to_s = e.get("to_state", "")
        if ev == "trip_created":
            ts_created = ts
        elif ev == "trip_state_change":
            if to_s == "assigned":
                ts_assigned = ts
            elif to_s == "accepted":
                ts_accepted = ts
            elif to_s == "ongoing":
                ts_ongoing = ts
            elif to_s == "completed":
                ts_completed = ts
        elif ev == "offers_sent":
            offers_sent += int(e.get("offers_count", 0) or 0)

    def _sec(a: datetime | None, b: datetime | None) -> int | None:
        if a is None or b is None:
            return None
        return int((b - a).total_seconds())

    # time_to_accept: from assign (or created if direct accept) to accepted
    time_to_accept = _sec(ts_assigned, ts_accepted) if ts_assigned else _sec(ts_created, ts_accepted)

    return {
        "trip_id": trip_id,
        "time_to_assign": _sec(ts_created, ts_assigned),
        "time_to_accept": time_to_accept,
        "time_to_start": _sec(ts_accepted, ts_ongoing),
        "total_duration": _sec(ts_created, ts_completed),
        "offers_sent": offers_sent,
        "events_count": len(entries),
    }


def get_trip_summary(trip_id: str) -> dict:
    """Return trip summary for GET /debug/trip/{id}/summary."""
    return _compute_trip_summary(trip_id)


def _trip_banner_title_new() -> str:
    """ASCII in ENV=test so pytest -s works on Windows (cp1252); emoji kept for dev."""
    try:
        from app.core.config import settings
    except Exception:
        return "🚗 NEW TRIP STARTED"
    if getattr(settings, "ENV", "") == "test":
        return "NEW TRIP STARTED"
    return "🚗 NEW TRIP STARTED"


def _trip_banner_title_done() -> str:
    try:
        from app.core.config import settings
    except Exception:
        return "✅ TRIP COMPLETED"
    if getattr(settings, "ENV", "") == "test":
        return "TRIP COMPLETED"
    return "✅ TRIP COMPLETED"


def _print_trip_header(trip_id: str) -> None:
    """A008: Print NEW TRIP banner."""
    tid = _serialize_value(trip_id)
    print("\n" + "=" * 30)
    print(_trip_banner_title_new())
    print(f"trip_id={tid}")
    print("=" * 30)


def _print_trip_completed(trip_id: str) -> None:
    """A008: Print TRIP COMPLETED banner and summary."""
    tid = _serialize_value(trip_id)
    summary = _compute_trip_summary(tid)
    print("\n" + "=" * 30)
    print(_trip_banner_title_done())
    print(f"trip_id={tid}")
    print("=" * 30)
    print("----- TRIP SUMMARY -----")
    print(f"trip_id={tid}")
    print(f"time_to_assign: {summary.get('time_to_assign', '?')}s")
    print(f"time_to_accept: {summary.get('time_to_accept', '?')}s")
    print(f"time_to_start: {summary.get('time_to_start', '?')}s")
    print(f"total_duration: {summary.get('total_duration', '?')}s")
    print(f"offers_sent: {summary.get('offers_sent', 0)}")
    print("------------------------")


def log_event(event_name: str, **fields) -> None:
    """Log a structured event. Timeline format, trip headers, buffer."""
    human_msg = _format_human_readable(event_name, **fields)
    line = f"{_time_prefix()} {human_msg}"
    if not _suppress_console_in_test(event_name):
        logger.info(line)

    trip_id = fields.get("trip_id")
    to_val = fields.get("to") or fields.get("to_state")
    to_str = _serialize_value(to_val) if to_val else None
    if trip_id is not None:
        trip_id_str = _serialize_value(trip_id)
        _append_to_buffer(trip_id_str, event_name, line, to_state=to_str)

        if event_name == "trip_created":
            _print_trip_header(trip_id)
        elif event_name == "trip_state_change" and to_str == "completed":
            _print_trip_completed(trip_id_str)


def log_debug_event(event_name: str, **fields) -> None:
    """Log only when DEBUG_RUNTIME_LOGS=True."""
    try:
        from app.core.config import settings
        if not getattr(settings, "DEBUG_RUNTIME_LOGS", False):
            return
    except Exception:
        return
    if _suppress_console_in_test(event_name):
        return
    human_msg = _format_human_readable(event_name, **fields)
    line = f"{_time_prefix()} {human_msg}"
    logger.info(line)

    trip_id = fields.get("trip_id")
    to_val = fields.get("to") or fields.get("to_state")
    to_str = _serialize_value(to_val) if to_val else None
    if trip_id is not None:
        trip_id_str = _serialize_value(trip_id)
        buffer_extra: dict | None = None
        if event_name == "offers_sent":
            buffer_extra = {"offers_count": int(fields.get("count") or 0)}
        _append_to_buffer(
            trip_id_str, event_name, line, to_state=to_str, buffer_extra=buffer_extra
        )


def should_log_driver_location(
    *,
    is_first_send: bool,
    has_active_trip: bool,
    old_lat: float | None,
    old_lng: float | None,
    new_lat: float,
    new_lng: float,
) -> bool:
    """A008: Only log when first send, significant change (>50m), or has active trip."""
    if is_first_send or has_active_trip:
        return True
    if old_lat is None or old_lng is None:
        return True
    try:
        from app.utils.geo import haversine_km
        dist_km = haversine_km(old_lat, old_lng, new_lat, new_lng)
        return dist_km >= LOCATION_CHANGE_THRESHOLD_KM
    except Exception:
        return True
