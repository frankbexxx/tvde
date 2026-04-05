"""Partner (fleet) API — isolated from passenger/driver/admin routers.

Endpoint audit (tenant scope = ctx.partner_id from get_current_partner only):
- GET /partner/drivers  — list_drivers_for_partner_enriched(partner_id)
- GET /partner/trips    — list_trips_for_partner(partner_id); trips = current driver mapping, see docstring there
- GET /partner/metrics  — partner_metrics(partner_id)

No global aggregates; partner role cannot call admin-only dependencies (require_role(admin)).
"""

import uuid

from fastapi import APIRouter, Depends, Request
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
    list_drivers_for_partner_enriched,
    list_trips_for_partner,
)
from app.services.partners_admin import partner_metrics
from app.utils.logging import log_event

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
    return [
        PartnerTripItem(
            trip_id=str(t.id),
            status=t.status.value,
            passenger_id=str(t.passenger_id),
            driver_id=str(t.driver_id) if t.driver_id else None,
            created_at=t.created_at.isoformat(),
            started_at=t.started_at.isoformat() if t.started_at else None,
            completed_at=t.completed_at.isoformat() if t.completed_at else None,
            updated_at=t.updated_at.isoformat(),
        )
        for t in trips
    ]


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
