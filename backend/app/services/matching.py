from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import DriverLocation
from app.utils.geo import haversine_km


def find_nearest_driver(
    *,
    db: Session,
    lat: float,
    lng: float,
    radius_km: float | None = None,
) -> Optional[Dict[str, Any]]:
    """
    MVP geographic matching:
    - Reads all driver_locations
    - Computes distance in Python (Haversine)
    - Filters by radius_km
    - Returns closest driver or None
    """
    r = radius_km if radius_km is not None else settings.GEO_RADIUS_KM
    locations = list(db.execute(select(DriverLocation)).scalars())
    if not locations:
        return None

    best_loc: Optional[DriverLocation] = None
    best_dist: float | None = None

    for loc in locations:
        d = haversine_km(float(loc.lat), float(loc.lng), lat, lng)
        if d <= r and (best_dist is None or d < best_dist):
            best_dist = d
            best_loc = loc

    if best_loc is None or best_dist is None:
        return None

    return {
        "driver_id": str(best_loc.driver_id),
        "lat": float(best_loc.lat),
        "lng": float(best_loc.lng),
        "distance_km": best_dist,
    }
