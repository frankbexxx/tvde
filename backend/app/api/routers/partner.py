"""Partner (fleet) API — isolated from passenger/driver/admin routers.

Endpoint audit (tenant scope = ctx.partner_id from get_current_partner only):
- GET /partner/drivers
- GET /partner/drivers/{driver_user_id}
- GET /partner/trips
- GET /partner/trips/{trip_id}
- GET /partner/trips/export  (CSV)
- GET /partner/metrics

No global aggregates; partner role cannot call admin-only dependencies (require_role(admin)).
"""

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_partner, get_db
from app.schemas.partner import (
    PartnerDriverItem,
    PartnerDriverLastLocation,
    PartnerDriverUserBrief,
    PartnerMetricsResponse,
    PartnerTripItem,
)
from app.services.partner_queries import (
    get_driver_for_partner,
    get_trip_for_partner,
    list_drivers_for_partner_enriched,
    list_trips_for_partner,
)
from app.services.partners_admin import partner_metrics
from app.utils.logging import log_event


def _utc_iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


router = APIRouter(prefix="/partner", tags=["partner"])


def _driver_item(d) -> PartnerDriverItem:
    loc = None
    if d.last_location is not None:
        loc = PartnerDriverLastLocation(
            lat=float(d.last_location.lat),
            lng=float(d.last_location.lng),
            timestamp=d.last_location.timestamp.isoformat(),
        )
    u = d.user
    return PartnerDriverItem(
        user_id=str(d.user_id),
        partner_id=str(d.partner_id),
        status=d.status.value,
        is_available=d.is_available,
        user=PartnerDriverUserBrief(
            name=u.name if u else None,
            phone=u.phone if u else None,
        ),
        last_location=loc,
    )


def _trip_item(t) -> PartnerTripItem:
    return PartnerTripItem(
        trip_id=str(t.id),
        status=t.status.value,
        passenger_id=str(t.passenger_id),
        driver_id=str(t.driver_id) if t.driver_id else None,
        created_at=t.created_at.isoformat(),
        started_at=t.started_at.isoformat() if t.started_at else None,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
        updated_at=t.updated_at.isoformat(),
    )


@router.get("/drivers", response_model=list[PartnerDriverItem])
async def partner_list_drivers(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerDriverItem]:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    drivers = list_drivers_for_partner_enriched(db, ctx.partner_id)
    return [_driver_item(d) for d in drivers]


@router.get("/drivers/{driver_user_id}", response_model=PartnerDriverItem)
async def partner_get_driver(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerDriverItem:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    d = get_driver_for_partner(db, ctx.partner_id, did)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d)


@router.get("/trips", response_model=list[PartnerTripItem])
async def partner_list_trips(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerTripItem]:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    trips = list_trips_for_partner(db, ctx.partner_id)
    return [_trip_item(t) for t in trips]


@router.get("/trips/export")
async def partner_export_trips_csv(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
):
    """Must be registered before /trips/{trip_id} so 'export' is not parsed as UUID."""
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    trips = list_trips_for_partner(db, ctx.partner_id)

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["trip_id", "driver_id", "status", "created_at", "completed_at"])
    for t in trips:
        w.writerow(
            [
                str(t.id),
                str(t.driver_id) if t.driver_id else "",
                t.status.value,
                _utc_iso(t.created_at),
                _utc_iso(t.completed_at),
            ]
        )

    data = buf.getvalue()
    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="partner_trips_export.csv"'
        },
    )


@router.get("/trips/{trip_id}", response_model=PartnerTripItem)
async def partner_get_trip(
    trip_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerTripItem:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    try:
        tid = uuid.UUID(trip_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    t = get_trip_for_partner(db, ctx.partner_id, tid)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _trip_item(t)


@router.get("/metrics", response_model=PartnerMetricsResponse)
async def partner_get_metrics(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerMetricsResponse:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    m = partner_metrics(db, uuid.UUID(ctx.partner_id))
    return PartnerMetricsResponse(**m)
