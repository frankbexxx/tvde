from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.core.config import settings
from app.models.enums import Role
from app.services.matching import find_nearest_driver


router = APIRouter(prefix="/matching", tags=["matching"])


class FindDriverRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class FindDriverResponse(BaseModel):
    driver_id: str
    lat: float
    lng: float
    distance_km: float


@router.post("/find-driver", response_model=FindDriverResponse)
async def find_driver(
    payload: FindDriverRequest,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver, Role.admin)),
    db: Session = Depends(get_db),
) -> FindDriverResponse:
    """
    Return the nearest available driver within a small radius.
    Temporary MVP algorithm based on last known locations.
    """
    _ = user  # currently not used for filtering; reserved for future rules.

    result = find_nearest_driver(
        db=db,
        lat=payload.lat,
        lng=payload.lng,
        radius_km=settings.GEO_RADIUS_KM,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="no_driver_found",
        )
    return FindDriverResponse(**result)
