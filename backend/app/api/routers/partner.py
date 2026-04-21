"""Partner (fleet) API — isolated from passenger/driver/admin routers.

Endpoint audit (tenant scope = ctx.partner_id from get_current_partner only):
- GET /partner/drivers
- GET /partner/drivers/{driver_user_id}
- PATCH /partner/drivers/{driver_user_id}/status  (C013)
- PATCH /partner/drivers/{driver_user_id}/availability  (C014)
- GET /partner/trips
- POST /partner/trips/{trip_id}/reassign-driver  (I011)
- GET /partner/trips/{trip_id}
- GET /partner/trips/export  (CSV)
- GET /partner/metrics

No global aggregates; partner role cannot call admin-only dependencies (require_role(admin)).
"""

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_partner, get_db
from app.schemas.partner import (
    PartnerDriverDiscoveryItem,
    PartnerDriverAvailabilityPatchRequest,
    PartnerDriverItem,
    PartnerDriverLastLocation,
    PartnerDriverStatusPatchRequest,
    PartnerDriverUserBrief,
    PartnerMetricsResponse,
    PartnerTripItem,
    PartnerTripReassignRequest,
)
from app.services.partner_driver_discovery import (
    discover_drivers_for_partner,
    partner_add_driver_to_fleet,
)
from app.services.partner_fleet import (
    set_partner_driver_availability,
    set_partner_driver_enabled,
)
from app.services.partner_queries import (
    get_driver_for_partner,
    get_trip_for_partner,
    list_drivers_for_partner_enriched,
    list_trips_for_partner,
)
from app.services.partner_trip_ops import partner_reassign_trip_driver
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


@router.get("/drivers/discover", response_model=list[PartnerDriverDiscoveryItem])
async def partner_discover_drivers(
    request: Request,
    q: str = Query(..., min_length=2),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerDriverDiscoveryItem]:
    assert ctx.partner_id is not None
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=ctx.partner_id,
    )
    drivers = discover_drivers_for_partner(db, query=q, limit=limit)
    out: list[PartnerDriverDiscoveryItem] = []
    for d in drivers:
        u = d.user
        out.append(
            PartnerDriverDiscoveryItem(
                user_id=str(d.user_id),
                name=u.name if u else None,
                phone=u.phone if u else None,
                status=d.status.value,
                partner_id=str(d.partner_id),
            )
        )
    return out


@router.post("/drivers/{driver_user_id}/add-to-fleet", response_model=PartnerDriverItem)
async def partner_add_driver(
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
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid"
        ) from None
    partner_add_driver_to_fleet(db, partner_id=ctx.partner_id, driver_user_id=did)
    d = get_driver_for_partner(db, ctx.partner_id, did)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d)


@router.patch("/drivers/{driver_user_id}/status", response_model=PartnerDriverItem)
async def partner_patch_driver_status(
    driver_user_id: str,
    body: PartnerDriverStatusPatchRequest,
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
    set_partner_driver_enabled(
        db,
        partner_id=ctx.partner_id,
        driver_user_id=did,
        enabled=body.enabled,
    )
    d = get_driver_for_partner(db, ctx.partner_id, did)
    assert d is not None
    return _driver_item(d)


@router.patch(
    "/drivers/{driver_user_id}/availability", response_model=PartnerDriverItem
)
async def partner_patch_driver_availability(
    driver_user_id: str,
    body: PartnerDriverAvailabilityPatchRequest,
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
    set_partner_driver_availability(
        db,
        partner_id=ctx.partner_id,
        driver_user_id=did,
        online=body.online,
    )
    d = get_driver_for_partner(db, ctx.partner_id, did)
    assert d is not None
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
    # SP-C: contrato estável — só acrescentar colunas no fim; versão no comentário da doc partner + UI.
    w.writerow(
        [
            "trip_id",
            "driver_id",
            "passenger_id",
            "status",
            "created_at",
            "started_at",
            "completed_at",
            "updated_at",
        ]
    )
    for t in trips:
        w.writerow(
            [
                str(t.id),
                str(t.driver_id) if t.driver_id else "",
                str(t.passenger_id),
                t.status.value,
                _utc_iso(t.created_at),
                _utc_iso(t.started_at),
                _utc_iso(t.completed_at),
                _utc_iso(t.updated_at),
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


@router.post("/trips/{trip_id}/reassign-driver", response_model=PartnerTripItem)
async def partner_post_trip_reassign_driver(
    trip_id: str,
    body: PartnerTripReassignRequest,
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
        nid = uuid.UUID(body.driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    t = partner_reassign_trip_driver(
        db,
        partner_id=ctx.partner_id,
        trip_id=tid,
        new_driver_user_id=nid,
    )
    return _trip_item(t)


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
