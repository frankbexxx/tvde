from __future__ import annotations

import math
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import DriverLocation


def _to_radians(deg: float) -> float:
    return deg * math.pi / 180.0


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in kilometers."""
    R = 6371.0
    d_lat = _to_radians(lat2 - lat1)
    d_lng = _to_radians(lng2 - lng1)
    rlat1 = _to_radians(lat1)
    rlat2 = _to_radians(lat2)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def find_nearest_driver(
    *,
    db: Session,
    lat: float,
    lng: float,
    radius_km: float = 5.0,
) -> Optional[Dict[str, Any]]:
    """
    MVP geographic matching:
    - Reads all driver_locations
    - Computes distance in Python (Haversine)
    - Filters by radius_km
    - Returns closest driver or None
    """
    locations = list(db.execute(select(DriverLocation)).scalars())
    if not locations:
        return None

    best_loc: Optional[DriverLocation] = None
    best_dist: float | None = None

    for loc in locations:
        d = _haversine_km(float(loc.lat), float(loc.lng), lat, lng)
        if d <= radius_km and (best_dist is None or d < best_dist):
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

