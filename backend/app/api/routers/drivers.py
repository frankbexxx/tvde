from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver import DriverLocationPayload
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

