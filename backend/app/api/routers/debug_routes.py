"""
Temporary debug routes for map/driver tracking diagnostics.
All endpoints return 404 when ENV != "dev" and ENABLE_DEV_TOOLS is false.
"""
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.db.models.driver import DriverLocation


def _require_dev() -> None:
    if settings.ENV != "dev" and not getattr(settings, "ENABLE_DEV_TOOLS", False):
        raise HTTPException(status_code=404)


router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/driver-locations")
async def debug_driver_locations(db: Session = Depends(get_db)) -> list[dict]:
    """
    Return all rows from driver_locations (dev only).
    Use to verify POST /drivers/location is storing updates.
    """
    _require_dev()
    rows = list(db.execute(select(DriverLocation)).scalars())
    return [
        {
            "driver_id": str(r.driver_id),
            "lat": float(r.lat),
            "lng": float(r.lng),
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in rows
    ]
