"""Read-only system health snapshot; logs when status is degraded."""

from typing import Any

from sqlalchemy.orm import Session

from app.services.system_health import get_system_health
from app.utils.logging import log_event


def run_system_health_check(db: Session) -> dict[str, Any]:
    """
    Run get_system_health(db) and emit a single structured log if not ok.
    Does not mutate data.
    """
    health = get_system_health(db)
    if health.get("status") != "ok":
        stuck = health.get("stuck_payments") or []
        inc = health.get("inconsistent_financial_state") or []
        missing = health.get("missing_payment_records") or []
        log_event(
            "system_health_degraded",
            status=health.get("status", ""),
            stuck_payments=len(stuck),
            inconsistent_financial_state=len(inc),
            missing_payment_records=len(missing),
            trips_accepted_too_long=len(health.get("trips_accepted_too_long") or []),
            trips_ongoing_too_long=len(health.get("trips_ongoing_too_long") or []),
            drivers_unavailable_too_long=len(health.get("drivers_unavailable_too_long") or []),
            warnings_summary=" | ".join(health.get("warnings") or []),
        )
        if len(stuck) > 0:
            log_event(
                "payment_stuck_processing_detected",
                count=len(stuck),
            )
    return health
