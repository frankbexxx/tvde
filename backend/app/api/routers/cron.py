"""Cron endpoint for scheduled jobs (cron-job.org). No JWT required; uses CRON_SECRET."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.cron.system_health_check import run_system_health_check
from app.services.cleanup import run_cleanup
from app.utils.logging import log_event
from app.services.offer_dispatch import expire_stale_offers, redispatch_expired_trips
from app.services.trip_timeouts import run_trip_timeouts


router = APIRouter(prefix="/cron", tags=["cron"])


@router.get("/jobs")
async def run_scheduled_jobs(
    secret: str = Query(..., description="CRON_SECRET from env"),
    db: Session = Depends(get_db),
) -> dict:
    """
    Run all scheduled maintenance jobs. Call from cron-job.org.

    Jobs executed:
    1. Trip timeouts (assigned→requested, accepted→cancelled, ongoing→failed)
    2. Offer expiry + redispatch (expire stale offers, create new for trips with all expired)
    3. Cleanup (audit_events retention)
    4. System health snapshot (read-only; log_event on transition into degraded only)

    Response: `system_health` contains counts and `warnings` only — never full diagnostic lists.

    Requires: ?secret=<CRON_SECRET>
    """
    cron_secret = getattr(settings, "CRON_SECRET", None)
    if not cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET not configured",
        )
    if secret != cron_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_secret",
        )

    timeouts = run_trip_timeouts(db)
    expired = expire_stale_offers(db)
    new_offers = redispatch_expired_trips(db)
    cleanup = run_cleanup(db)
    system_health = run_system_health_check(db)

    log_event(
        "cron_jobs_run",
        assigned_to_requested=timeouts.get("assigned_to_requested", 0),
        accepted_to_cancelled=timeouts.get("accepted_to_cancelled", 0),
        ongoing_to_failed=timeouts.get("ongoing_to_failed", 0),
        offers_expired=expired,
        redispatch_offers_created=len(new_offers),
        audit_events_deleted=cleanup.get("audit_events_deleted", 0),
        system_health_status=system_health.get("status", ""),
    )

    return {
        "status": "ok",
        "timeouts": {
            "assigned_to_requested": timeouts.get("assigned_to_requested", 0),
            "accepted_to_cancelled": timeouts.get("accepted_to_cancelled", 0),
            "ongoing_to_failed": timeouts.get("ongoing_to_failed", 0),
        },
        "offers": {
            "expired_count": expired,
            "redispatch_created": len(new_offers),
        },
        "cleanup": cleanup,
        "system_health": {
            "status": system_health.get("status"),
            "stuck_payments": len(system_health.get("stuck_payments") or []),
            "inconsistent_financial_state": len(
                system_health.get("inconsistent_financial_state") or []
            ),
            "missing_payment_records": len(
                system_health.get("missing_payment_records") or []
            ),
            "warnings": system_health.get("warnings") or [],
        },
    }
