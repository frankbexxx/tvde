"""Driver zone-change API (v1).

See ``docs/product/DRIVER_MENU_SPEC.md`` §7. Mark ``arrived`` then first completed trip
consumes the daily budget slot for the session's ``started_at`` local day.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver_zones import (
    DriverZoneBudgetResponse,
    DriverZoneCatalogItem,
    DriverZoneCatalogResponse,
    DriverZoneCustomCreateRequest,
    DriverZoneCustomItem,
    DriverZoneCustomListResponse,
    DriverZoneEtaEstimateRequest,
    DriverZoneEtaEstimateResponse,
    DriverZoneOpenSessionResponse,
    DriverZoneSessionCancelRequest,
    DriverZoneSessionCreateRequest,
    DriverZoneSessionExtensionRequest,
    DriverZoneSessionResponse,
)
from app.services.driver_zones import (
    add_driver_custom_zone,
    budget_values,
    cancel_zone_session,
    create_zone_session,
    estimate_zone_eta_seconds,
    get_open_zone_session,
    list_driver_custom_zones,
    mark_session_arrived,
    remove_driver_custom_zone,
    request_zone_session_extension,
    service_date_local_now,
)
from app.services.zone_catalog import list_zone_catalog

router = APIRouter(prefix="/driver/zones", tags=["driver"])


@router.get("/catalog", response_model=DriverZoneCatalogResponse)
async def get_zone_catalog(
    _user: UserContext = Depends(require_role(Role.driver)),
) -> DriverZoneCatalogResponse:
    rows = list_zone_catalog()
    return DriverZoneCatalogResponse(zones=[DriverZoneCatalogItem.model_validate(r) for r in rows])


@router.get("/budget/today", response_model=DriverZoneBudgetResponse)
async def get_zone_budget_today(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneBudgetResponse:
    driver_id = uuid.UUID(user.user_id)
    sd = service_date_local_now()
    used, max_c, tz = budget_values(db, driver_id=driver_id, service_date=sd)
    remaining = max(0, max_c - used)
    return DriverZoneBudgetResponse(
        service_date=sd,
        used_changes=used,
        max_changes=max_c,
        remaining=remaining,
        timezone=tz,
    )


@router.get("/custom-zones", response_model=DriverZoneCustomListResponse)
async def get_driver_custom_zones(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneCustomListResponse:
    driver_id = uuid.UUID(user.user_id)
    rows = list_driver_custom_zones(db, driver_id=driver_id)
    return DriverZoneCustomListResponse(
        zones=[DriverZoneCustomItem.model_validate(r) for r in rows]
    )


@router.post("/custom-zones", response_model=DriverZoneCustomItem, status_code=status.HTTP_201_CREATED)
async def post_driver_custom_zone(
    body: DriverZoneCustomCreateRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneCustomItem:
    driver_id = uuid.UUID(user.user_id)
    try:
        row = add_driver_custom_zone(db, driver_id=driver_id, zone_id=body.zone_id)
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code == "custom_zone_invalid":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=code) from exc
        if code in ("custom_zone_conflicts_catalog", "custom_zone_limit_reached"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=code) from exc
        raise
    return DriverZoneCustomItem.model_validate(row)


@router.delete("/custom-zones/{zone_id}", status_code=status.HTTP_200_OK)
async def delete_driver_custom_zone(
    zone_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    driver_id = uuid.UUID(user.user_id)
    removed = remove_driver_custom_zone(db, driver_id=driver_id, zone_id=zone_id)
    db.commit()
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="custom_zone_not_found")
    return {"ok": True}


@router.post("/eta-estimate", response_model=DriverZoneEtaEstimateResponse)
async def post_zone_eta_estimate(
    body: DriverZoneEtaEstimateRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneEtaEstimateResponse:
    driver_id = uuid.UUID(user.user_id)
    try:
        eta_seconds, distance_km = estimate_zone_eta_seconds(
            db,
            driver_id=driver_id,
            zone_id=body.zone_id,
        )
    except ValueError as exc:
        code = str(exc)
        if code in ("driver_location_required_for_zone_eta", "zone_eta_anchor_not_available"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=code,
            ) from exc
        raise
    return DriverZoneEtaEstimateResponse(
        zone_id=body.zone_id.strip().lower(),
        eta_seconds_baseline=eta_seconds,
        source="server_haversine",
        distance_km=round(distance_km, 3),
    )


@router.get("/sessions/open", response_model=DriverZoneOpenSessionResponse)
async def get_zone_session_open(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneOpenSessionResponse:
    driver_id = uuid.UUID(user.user_id)
    sess = get_open_zone_session(db, driver_id=driver_id)
    if sess is None:
        return DriverZoneOpenSessionResponse(session=None)
    return DriverZoneOpenSessionResponse(
        session=DriverZoneSessionResponse.model_validate(sess)
    )


@router.post("/sessions", response_model=DriverZoneSessionResponse, status_code=status.HTTP_201_CREATED)
async def post_zone_session(
    body: DriverZoneSessionCreateRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneSessionResponse:
    driver_id = uuid.UUID(user.user_id)
    try:
        sess = create_zone_session(
            db,
            driver_id=driver_id,
            zone_id=body.zone_id,
            eta_seconds_baseline=body.eta_seconds_baseline,
            eta_margin_percent=body.eta_margin_percent,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code == "zone_change_budget_exhausted":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=code,
            ) from exc
        if code == "zone_session_already_open":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=code,
            ) from exc
        raise
    return DriverZoneSessionResponse.model_validate(sess)


@router.post(
    "/sessions/{session_id}/arrived",
    response_model=DriverZoneSessionResponse,
)
async def post_zone_session_arrived(
    session_id: uuid.UUID,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneSessionResponse:
    driver_id = uuid.UUID(user.user_id)
    try:
        sess = mark_session_arrived(db, driver_id=driver_id, session_id=session_id)
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code == "zone_session_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=exc.args[0],
            ) from exc
        if code in (
            "driver_location_required_for_zone_arrived",
            "driver_outside_zone_for_arrived",
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=code,
            ) from exc
        raise
    return DriverZoneSessionResponse.model_validate(sess)


@router.post(
    "/sessions/{session_id}/request-extension",
    response_model=DriverZoneSessionResponse,
)
async def post_zone_session_request_extension(
    session_id: uuid.UUID,
    body: DriverZoneSessionExtensionRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneSessionResponse:
    driver_id = uuid.UUID(user.user_id)
    try:
        sess = request_zone_session_extension(
            db,
            driver_id=driver_id,
            session_id=session_id,
            reason=body.reason,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        code = str(exc)
        if code == "zone_session_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=code,
            ) from exc
        if code == "extension_reason_too_short":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=code,
            ) from exc
        if code in ("extension_pending", "extension_already_used"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=code,
            ) from exc
        raise
    return DriverZoneSessionResponse.model_validate(sess)


@router.post(
    "/sessions/{session_id}/cancel",
    response_model=DriverZoneSessionResponse,
)
async def post_zone_session_cancel(
    session_id: uuid.UUID,
    body: DriverZoneSessionCancelRequest | None = None,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverZoneSessionResponse:
    driver_id = uuid.UUID(user.user_id)
    reason = body.cancel_reason if body else None
    try:
        sess = cancel_zone_session(
            db,
            driver_id=driver_id,
            session_id=session_id,
            cancel_reason=reason,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        if str(exc) == "zone_session_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=exc.args[0],
            ) from exc
        raise
    return DriverZoneSessionResponse.model_validate(sess)
