"""M2-L4 Emergency / SOS API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.emergency import (
    EmergencyEventRequest,
    EmergencyEventResponse,
    EmergencySnapshotResponse,
)
from app.services.emergency import get_emergency_snapshot, record_emergency_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.get(
    "/trips/{trip_id}/snapshot",
    response_model=EmergencySnapshotResponse,
)
async def emergency_snapshot(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> EmergencySnapshotResponse:
    """Authenticated emergency snapshot for the caller's own eligible trip."""
    return get_emergency_snapshot(
        db,
        user_id=user.user_id,
        role=user.role,
        trip_id=trip_id,
    )


@router.post(
    "/trips/{trip_id}/events",
    response_model=EmergencyEventResponse,
)
async def emergency_event(
    trip_id: str,
    body: EmergencyEventRequest,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> EmergencyEventResponse:
    """Record emergency.opened | call_initiated | shared (explicit user action)."""
    try:
        record_emergency_event(
            db,
            user_id=user.user_id,
            role=user.role,
            trip_id=trip_id,
            action=body.action,
        )
        return EmergencyEventResponse(ok=True, recorded=True)
    except HTTPException:
        raise
    except Exception:
        logger.exception("emergency_event_record_failed")
        # Soft failure for UX paths that call this before tel:/share.
        return EmergencyEventResponse(ok=True, recorded=False)
