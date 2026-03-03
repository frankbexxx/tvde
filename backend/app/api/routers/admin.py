import csv
import io
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.interaction_log import InteractionLog
from app.models.enums import Role
from app.schemas.driver import DriverStatusResponse
from app.schemas.system_health import RunTimeoutsResponse, SystemHealthResponse
from app.api.serializers import trip_to_detail, trip_to_status_response
from app.schemas.trip import TripActiveItem, TripDetailResponse, TripStatusResponse
from app.services.system_health import get_system_health
from app.services.trip_timeouts import run_trip_timeouts
from app.services.trips import assign_trip, get_trip_by_id


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/system-health", response_model=SystemHealthResponse)
async def system_health(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> SystemHealthResponse:
    """Detect stuck states and inconsistencies. Read-only, no side effects."""
    data = get_system_health(db)
    return SystemHealthResponse(**data)


@router.post("/drivers/{driver_id}/approve", response_model=DriverStatusResponse)
async def approve_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/drivers/{driver_id}/reject", response_model=DriverStatusResponse)
async def reject_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/trips/active", response_model=List[TripActiveItem])
async def list_active_trips(
    user: UserContext = Depends(require_role(Role.admin)),
) -> List[TripActiveItem]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/trips/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripDetailResponse:
    """Full trip detail for admin (includes stripe_payment_intent_id). Read-only."""
    trip = get_trip_by_id(db=db, trip_id=trip_id.strip())
    return trip_to_detail(trip, include_stripe_pi=True)


@router.post("/run-timeouts", response_model=RunTimeoutsResponse)
async def run_timeouts_admin(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> RunTimeoutsResponse:
    """Run trip timeout rules (assigned→requested, accepted→cancelled, ongoing→failed)."""
    counts = run_trip_timeouts(db)
    return RunTimeoutsResponse(**counts)


@router.get("/export-logs")
async def export_interaction_logs(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
    format: str | None = Query(None, alias="format"),
) -> dict | PlainTextResponse:
    """Export interaction logs. JSON por defeito; ?format=csv para CSV."""
    logs = db.execute(
        select(InteractionLog).order_by(InteractionLog.timestamp.asc())
    ).scalars().all()

    if format == "csv":
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow([
            "timestamp", "user_id", "role", "action", "trip_id",
            "previous_state", "new_state", "latency_ms", "payment_status",
        ])
        for log in logs:
            w.writerow([
                log.timestamp.isoformat() if log.timestamp else "",
                log.user_id or "",
                log.role or "",
                log.action or "",
                log.trip_id or "",
                log.previous_state or "",
                log.new_state or "",
                log.latency_ms if log.latency_ms is not None else "",
                log.payment_status or "",
            ])
        return PlainTextResponse(
            content=out.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=interaction_logs.csv"},
        )

    return {
        "logs": [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user_id": log.user_id,
                "role": log.role,
                "action": log.action,
                "trip_id": log.trip_id,
                "previous_state": log.previous_state,
                "new_state": log.new_state,
                "latency_ms": log.latency_ms,
                "payment_status": log.payment_status,
            }
            for log in logs
        ],
    }


@router.post("/trips/{trip_id}/assign", response_model=TripStatusResponse)
async def assign_trip_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    trip = assign_trip(
        db=db,
        trip_id=trip_id.strip(),
    )
    return trip_to_status_response(trip, include_stripe_pi=True)

