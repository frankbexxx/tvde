import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver import DriverLocationPayload
from app.schemas.driver import DriverLocationResponse
from app.db.models.driver import DriverLocation
from app.services.driver_location import upsert_driver_location


router = APIRouter(prefix="/drivers", tags=["driver"])
# Alias singular (spec / clients): same behaviour as POST /drivers/location
driver_router = APIRouter(prefix="/driver", tags=["driver"])


def _persist_driver_location(
    *,
    db: Session,
    user: UserContext,
    payload: DriverLocationPayload,
) -> None:
    upsert_driver_location(
        db=db,
        driver_id=user.user_id,
        lat=payload.lat,
        lng=payload.lng,
        timestamp_ms=payload.timestamp,
    )


@router.post(
    "/location",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update current driver location",
)
async def update_location(
    payload: DriverLocationPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    """
    Receive the driver's current GPS location.

    Frontend: called every few seconds when driver is online.
    """
    _persist_driver_location(db=db, user=user, payload=payload)


@router.get(
    "/location/last",
    response_model=DriverLocationResponse,
    summary="Get last stored driver location (server-side)",
)
async def get_last_location(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverLocationResponse:
    """Returns what the server has stored (useful to debug 'GPS upload ok' vs DB)."""
    driver_uuid = uuid.UUID(str(user.user_id))
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_uuid).limit(1)
    ).scalar_one_or_none()
    if loc is None:
        # Keep consistent with start_trip expectation
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="driver_location_not_found"
        )
    ts = loc.timestamp
    if ts.tzinfo is None:
        from datetime import timezone

        ts = ts.replace(tzinfo=timezone.utc)
    return DriverLocationResponse(
        lat=float(loc.lat),
        lng=float(loc.lng),
        timestamp=int(ts.timestamp() * 1000),
    )


@driver_router.post(
    "/location",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update current driver location (alias)",
)
async def update_location_alias(
    payload: DriverLocationPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    """Same as POST /drivers/location."""
    _persist_driver_location(db=db, user=user, payload=payload)
