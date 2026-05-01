"""Driver zone-change API (v1 skeleton).

See ``docs/product/DRIVER_MENU_SPEC.md`` §7. Consumption on trip completion is not wired yet.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver_zones import (
    DriverZoneBudgetResponse,
    DriverZoneSessionCreateRequest,
    DriverZoneSessionResponse,
)
from app.services.driver_zones import budget_values, create_zone_session, service_date_local_now

router = APIRouter(prefix="/driver/zones", tags=["driver"])


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
