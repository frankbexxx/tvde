"""Cron endpoint for scheduled jobs (cron-job.org). No JWT required; uses CRON_SECRET."""

import time
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
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
    secret: str | None = Query(
        None, description="CRON_SECRET from env (legacy: query string)"
    ),
    x_cron_secret: str | None = Header(
        None,
        alias="X-Cron-Secret",
        description="CRON_SECRET from env (preferred: header)",
    ),
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

    Auth:
    - Preferred: Header `X-Cron-Secret: <CRON_SECRET>`
    - Legacy:    Query `?secret=<CRON_SECRET>`
    """
    cron_secret = getattr(settings, "CRON_SECRET", None)
    if not cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET not configured",
        )
    provided = x_cron_secret or secret
    if not provided or provided != cron_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_secret",
        )

    started = time.monotonic()
    log_event("cron_started")

    errors: dict[str, str] = {}

    # Each sub-job is isolated: one failure must not block the others.
    try:
        timeouts = run_trip_timeouts(db)
        log_event(
            "cron_job_ok",
            job="trip_timeouts",
            assigned_to_requested=timeouts.get("assigned_to_requested", 0),
            accepted_to_cancelled=timeouts.get("accepted_to_cancelled", 0),
            ongoing_to_failed=timeouts.get("ongoing_to_failed", 0),
        )
    except Exception as e:
        timeouts = {
            "assigned_to_requested": 0,
            "accepted_to_cancelled": 0,
            "ongoing_to_failed": 0,
        }
        errors["trip_timeouts"] = str(e)
        log_event("cron_job_error", job="trip_timeouts", error=str(e))

    try:
        expired = expire_stale_offers(db)
        log_event("cron_job_ok", job="expire_stale_offers", offers_expired=expired)
    except Exception as e:
        expired = 0
        errors["expire_stale_offers"] = str(e)
        log_event("cron_job_error", job="expire_stale_offers", error=str(e))

    try:
        new_offers = redispatch_expired_trips(db)
        log_event(
            "cron_job_ok",
            job="redispatch_expired_trips",
            redispatch_offers_created=len(new_offers),
        )
    except Exception as e:
        new_offers = []
        errors["redispatch_expired_trips"] = str(e)
        log_event("cron_job_error", job="redispatch_expired_trips", error=str(e))

    try:
        cleanup = run_cleanup(db)
        log_event(
            "cron_job_ok",
            job="cleanup",
            audit_events_deleted=cleanup.get("audit_events_deleted", 0),
        )
    except Exception as e:
        cleanup = {"audit_events_deleted": 0}
        errors["cleanup"] = str(e)
        log_event("cron_job_error", job="cleanup", error=str(e))

    try:
        system_health = run_system_health_check(db)
        log_event(
            "cron_job_ok",
            job="system_health_check",
            system_health_status=system_health.get("status", ""),
        )
    except Exception as e:
        system_health = {"status": "error", "warnings": [str(e)]}
        errors["system_health_check"] = str(e)
        log_event("cron_job_error", job="system_health_check", error=str(e))

    elapsed_ms = int(round((time.monotonic() - started) * 1000))
    log_event(
        "cron_finished",
        duration_ms=elapsed_ms,
        ok=(len(errors) == 0),
        error_count=len(errors),
    )

    log_event(
        "cron_jobs_run",
        assigned_to_requested=timeouts.get("assigned_to_requested", 0),
        accepted_to_cancelled=timeouts.get("accepted_to_cancelled", 0),
        ongoing_to_failed=timeouts.get("ongoing_to_failed", 0),
        offers_expired=expired,
        redispatch_offers_created=len(new_offers),
        audit_events_deleted=cleanup.get("audit_events_deleted", 0),
        system_health_status=system_health.get("status", ""),
        duration_ms=elapsed_ms,
        ok=(len(errors) == 0),
        error_count=len(errors),
    )

    return {
        "status": "ok" if len(errors) == 0 else "partial_error",
        "duration_ms": elapsed_ms,
        "errors": errors,
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
