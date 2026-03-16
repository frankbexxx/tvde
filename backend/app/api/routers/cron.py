"""Cron endpoint for scheduled jobs (cron-job.org). No JWT required; uses CRON_SECRET."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
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
    }
