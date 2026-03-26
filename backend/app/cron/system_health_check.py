"""Read-only system health snapshot; logs when status becomes degraded (no spam while staying degraded)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.system_health import get_system_health
from app.utils.logging import log_event

# In-process: avoids repeating system_health_degraded on every cron tick while still degraded.
# Multi-worker: each process has its own flag (may log once per worker on transition).
_last_system_health_status_for_log: str | None = None


def run_system_health_check(db: Session) -> dict[str, Any]:
    """
    Run get_system_health(db). On transition into degraded (from ok or cold start),
    emit structured logs. Does not mutate data.
    """
    global _last_system_health_status_for_log

    health = get_system_health(db)
    current = health.get("status") or "ok"
    prev = _last_system_health_status_for_log

    if current != "ok":
        stuck = health.get("stuck_payments") or []
        should_log_degraded = prev in (None, "ok")
        if should_log_degraded:
            inc = health.get("inconsistent_financial_state") or []
            missing = health.get("missing_payment_records") or []
            log_event(
                "system_health_degraded",
                status=current,
                stuck_payments=len(stuck),
                inconsistent_financial_state=len(inc),
                missing_payment_records=len(missing),
                trips_accepted_too_long=len(health.get("trips_accepted_too_long") or []),
                trips_ongoing_too_long=len(health.get("trips_ongoing_too_long") or []),
                drivers_unavailable_too_long=len(
                    health.get("drivers_unavailable_too_long") or []
                ),
                warnings_summary=" | ".join(health.get("warnings") or []),
            )
            if len(stuck) > 0:
                sample_payment_ids = [
                    str(item.get("id", ""))
                    for item in stuck[:3]
                    if isinstance(item, dict) and item.get("id")
                ]
                log_event(
                    "payment_stuck_processing_detected",
                    count=len(stuck),
                    sample_payment_ids=sample_payment_ids,
                )
        _last_system_health_status_for_log = current
    else:
        _last_system_health_status_for_log = "ok"

    return health
