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
- POST /partner/drivers/{driver_user_id}/zones/sessions/{session_id}/approve-extension
- GET /partner/drivers/{driver_user_id}/zones/budget/today
- POST /partner/drivers/{driver_user_id}/zones/budget/grant-extra

No global aggregates; partner role cannot call admin-only dependencies (require_role(admin)).
"""

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_partner, get_db
from app.schemas.driver_zones import (
    DriverZoneBudgetResponse,
    DriverZoneOpenSessionResponse,
    DriverZoneSessionResponse,
    PartnerGrantZoneBudgetExtraRequest,
    PartnerZoneSessionApproveExtensionRequest,
)
from app.schemas.driver_documents import PartnerDriverDocumentsPatchRequest
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
from app.schemas.partner_messages import (
    PartnerInboxMessageItem,
    PartnerMessageCreateRequest,
    PartnerMessageItem,
)
from app.services.driver_documents import apply_partner_documents_patch, parse_documents_column
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
from app.services.driver_zones import (
    approve_zone_session_extension,
    budget_values,
    get_open_zone_session,
    grant_partner_zone_budget_extra,
    service_date_local_now,
)
from app.services.partner_trip_ops import partner_reassign_trip_driver
from app.services.partner_messages import (
    create_partner_message,
    list_partner_inbox_from_drivers,
    list_partner_sent_messages,
    mark_partner_message_read,
    _utc_iso as message_utc_iso,
)
from app.services.driver_document_upload import resolve_driver_document_path
from app.services.partners_admin import partner_metrics, partner_remove_driver_from_fleet
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


def _require_partner_id(ctx: UserContext) -> str:
    pid = ctx.partner_id
    if pid is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="partner_scope_required",
        )
    return pid


def _driver_item(d, *, include_documents: bool = False) -> PartnerDriverItem:
    loc = None
    if d.last_location is not None:
        loc = PartnerDriverLastLocation(
            lat=float(d.last_location.lat),
            lng=float(d.last_location.lng),
            timestamp=d.last_location.timestamp.isoformat(),
        )
    u = d.user
    documents = None
    if include_documents:
        documents = parse_documents_column(d.documents)["docs"]
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
        documents=documents,
    )


def _trip_item(t) -> PartnerTripItem:
    return PartnerTripItem(
        trip_id=str(t.id),
        status=t.status.value,
        passenger_id=str(t.passenger_id),
        driver_id=str(t.driver_id) if t.driver_id else None,
        origin_lat=float(t.origin_lat),
        origin_lng=float(t.origin_lng),
        destination_lat=float(t.destination_lat),
        destination_lng=float(t.destination_lng),
        estimated_price=float(t.estimated_price),
        final_price=float(t.final_price) if t.final_price is not None else None,
        cancel_reason=t.cancellation_reason,
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
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    drivers = list_drivers_for_partner_enriched(db, partner_id)
    return [_driver_item(d, include_documents=True) for d in drivers]


@router.get("/drivers/discover", response_model=list[PartnerDriverDiscoveryItem])
async def partner_discover_drivers(
    request: Request,
    q: str = Query(..., min_length=2),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerDriverDiscoveryItem]:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
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


@router.get("/drivers/{driver_user_id}", response_model=PartnerDriverItem)
async def partner_get_driver(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerDriverItem:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    d = get_driver_for_partner(db, partner_id, did)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d, include_documents=True)


@router.post("/drivers/{driver_user_id}/add-to-fleet", response_model=PartnerDriverItem)
async def partner_add_driver(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerDriverItem:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid"
        ) from None
    partner_add_driver_to_fleet(db, partner_id=partner_id, driver_user_id=did)
    d = get_driver_for_partner(db, partner_id, did)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d)


@router.delete("/drivers/{driver_user_id}/from-fleet", status_code=status.HTTP_204_NO_CONTENT)
async def partner_remove_driver_from_fleet_endpoint(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> None:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
        pid = uuid.UUID(partner_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    partner_remove_driver_from_fleet(db, partner_id=pid, driver_user_id=did)


@router.patch("/drivers/{driver_user_id}/status", response_model=PartnerDriverItem)
async def partner_patch_driver_status(
    driver_user_id: str,
    body: PartnerDriverStatusPatchRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerDriverItem:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
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
        partner_id=partner_id,
        driver_user_id=did,
        enabled=body.enabled,
    )
    d = get_driver_for_partner(db, partner_id, did)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
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
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
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
        partner_id=partner_id,
        driver_user_id=did,
        online=body.online,
    )
    d = get_driver_for_partner(db, partner_id, did)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d)


@router.patch(
    "/drivers/{driver_user_id}/documents",
    response_model=PartnerDriverItem,
)
async def partner_patch_driver_documents(
    driver_user_id: str,
    body: PartnerDriverDocumentsPatchRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerDriverItem:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    apply_partner_documents_patch(
        db,
        partner_id=partner_id,
        driver_user_id=did,
        patch=body.docs,
    )
    d = get_driver_for_partner(db, partner_id, did)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _driver_item(d, include_documents=True)


@router.get("/trips", response_model=list[PartnerTripItem])
async def partner_list_trips(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerTripItem]:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    trips = list_trips_for_partner(db, partner_id)
    return [_trip_item(t) for t in trips]


@router.get("/trips/export")
async def partner_export_trips_csv(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
):
    """Must be registered before /trips/{trip_id} so 'export' is not parsed as UUID."""
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    trips = list_trips_for_partner(db, partner_id)

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
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
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
        partner_id=partner_id,
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
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        tid = uuid.UUID(trip_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    t = get_trip_for_partner(db, partner_id, tid)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return _trip_item(t)


@router.get(
    "/drivers/{driver_user_id}/zones/sessions/open",
    response_model=DriverZoneOpenSessionResponse,
)
async def partner_get_driver_zone_session_open(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> DriverZoneOpenSessionResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    drv = get_driver_for_partner(db, partner_id, did)
    if drv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    sess = get_open_zone_session(db, driver_id=did)
    if sess is None:
        return DriverZoneOpenSessionResponse(session=None)
    return DriverZoneOpenSessionResponse(
        session=DriverZoneSessionResponse.model_validate(sess)
    )


@router.post(
    "/drivers/{driver_user_id}/zones/sessions/{session_id}/approve-extension",
    response_model=DriverZoneSessionResponse,
)
async def partner_approve_zone_session_extension(
    driver_user_id: str,
    session_id: str,
    body: PartnerZoneSessionApproveExtensionRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> DriverZoneSessionResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
        sid = uuid.UUID(session_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    try:
        sess = approve_zone_session_extension(
            db,
            partner_id=partner_id,
            driver_user_id=did,
            session_id=sid,
            extra_seconds=body.extra_seconds,
            partner_actor_user_id=uuid.UUID(ctx.user_id),
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code in ("driver_not_found_for_partner", "zone_session_not_found"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=code,
            ) from exc
        if code in (
            "extension_not_requested",
            "extension_already_approved",
            "extension_extra_seconds_invalid",
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=code,
            ) from exc
        raise
    return DriverZoneSessionResponse.model_validate(sess)


@router.get(
    "/drivers/{driver_user_id}/zones/budget/today",
    response_model=DriverZoneBudgetResponse,
)
async def partner_get_driver_zone_budget_today(
    driver_user_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> DriverZoneBudgetResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    drv = get_driver_for_partner(db, partner_id, did)
    if drv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found_for_partner",
        )
    sd = service_date_local_now()
    used, max_c, tz = budget_values(db, driver_id=did, service_date=sd)
    remaining = max(0, max_c - used)
    return DriverZoneBudgetResponse(
        service_date=sd,
        used_changes=used,
        max_changes=max_c,
        remaining=remaining,
        timezone=tz,
    )


@router.post(
    "/drivers/{driver_user_id}/zones/budget/grant-extra",
    response_model=DriverZoneBudgetResponse,
)
async def partner_post_driver_zone_budget_grant_extra(
    driver_user_id: str,
    body: PartnerGrantZoneBudgetExtraRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> DriverZoneBudgetResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        ) from None
    try:
        row = grant_partner_zone_budget_extra(
            db,
            partner_id=partner_id,
            driver_user_id=did,
            service_date=body.service_date,
            extra_max_changes=body.extra_max_changes,
            partner_actor_user_id=uuid.UUID(ctx.user_id),
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code == "driver_not_found_for_partner":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=code,
            ) from exc
        if code in ("grant_extra_max_changes_invalid", "grant_extra_max_ceiling_exceeded"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=code,
            ) from exc
        raise
    used = int(row.used_changes_count)
    max_c = int(row.max_changes_count)
    tz = row.timezone
    remaining = max(0, max_c - used)
    return DriverZoneBudgetResponse(
        service_date=row.service_date,
        used_changes=used,
        max_changes=max_c,
        remaining=remaining,
        timezone=tz,
    )


@router.get("/metrics", response_model=PartnerMetricsResponse)
async def partner_get_metrics(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerMetricsResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    m = partner_metrics(db, uuid.UUID(partner_id))
    return PartnerMetricsResponse(**m)


@router.get("/messages/sent", response_model=list[PartnerMessageItem])
async def partner_list_sent_messages(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerMessageItem]:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    rows = list_partner_sent_messages(db, partner_id=uuid.UUID(partner_id))
    return [
        PartnerMessageItem(
            id=str(m.id),
            title=m.title,
            body=m.body,
            priority=m.priority,
            created_at=message_utc_iso(m.created_at),
            driver_user_id=str(m.driver_user_id) if m.driver_user_id else None,
            direction=m.direction,
            read=False,
        )
        for m in rows
    ]


@router.get("/messages/inbox", response_model=list[PartnerInboxMessageItem])
async def partner_list_inbox_from_drivers(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerInboxMessageItem]:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    pid = uuid.UUID(partner_id)
    puid = uuid.UUID(ctx.user_id)
    rows = list_partner_inbox_from_drivers(db, partner_id=pid, partner_user_id=puid)
    return [
        PartnerInboxMessageItem(
            id=str(m.id),
            title=m.title,
            body=m.body,
            priority=m.priority,
            created_at=message_utc_iso(m.created_at),
            driver_user_id=str(m.driver_user_id) if m.driver_user_id else "",
            read=read,
        )
        for m, read in rows
        if m.driver_user_id is not None
    ]


@router.patch("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def partner_mark_message_read(
    message_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> None:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        mid = uuid.UUID(message_id.strip())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid") from None
    mark_partner_message_read(
        db,
        partner_id=uuid.UUID(partner_id),
        partner_user_id=uuid.UUID(ctx.user_id),
        message_id=mid,
    )


@router.get("/messages", response_model=list[PartnerMessageItem])
async def partner_list_messages(
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> list[PartnerMessageItem]:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    rows = list_partner_sent_messages(db, partner_id=uuid.UUID(partner_id))
    return [
        PartnerMessageItem(
            id=str(m.id),
            title=m.title,
            body=m.body,
            priority=m.priority,
            created_at=message_utc_iso(m.created_at),
            driver_user_id=str(m.driver_user_id) if m.driver_user_id else None,
            direction=m.direction,
            read=False,
        )
        for m in rows
    ]


@router.post("/messages", response_model=PartnerMessageItem, status_code=status.HTTP_201_CREATED)
async def partner_create_message(
    body: PartnerMessageCreateRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> PartnerMessageItem:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    did: uuid.UUID | None = None
    if body.driver_user_id:
        try:
            did = uuid.UUID(body.driver_user_id.strip())
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid") from None
    msg = create_partner_message(
        db,
        partner_id=uuid.UUID(partner_id),
        created_by=uuid.UUID(ctx.user_id),
        title=body.title,
        body=body.body,
        priority=body.priority,
        driver_user_id=did,
    )
    return PartnerMessageItem(
        id=str(msg.id),
        title=msg.title,
        body=msg.body,
        priority=msg.priority,
        created_at=message_utc_iso(msg.created_at),
        driver_user_id=str(msg.driver_user_id) if msg.driver_user_id else None,
        direction=msg.direction,
        read=False,
    )


@router.get("/drivers/{driver_user_id}/documents/{doc_key}/file")
async def partner_download_driver_document(
    driver_user_id: str,
    doc_key: str,
    request: Request,
    ctx: UserContext = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> FileResponse:
    partner_id = _require_partner_id(ctx)
    log_event(
        "partner_api_access",
        path=request.url.path,
        user_id=ctx.user_id,
        partner_id=partner_id,
    )
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid") from None
    path = resolve_driver_document_path(
        db,
        driver_user_id=did,
        doc_key=doc_key,
        partner_id=uuid.UUID(partner_id),
    )
    return FileResponse(path, filename=path.name)
