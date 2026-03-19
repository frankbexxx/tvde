"""OSRM route service for real road distance and duration."""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_route_distance_duration(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    timeout: float = 5.0,
) -> tuple[float, float] | None:
    """
    Get road distance (km) and duration (min) from OSRM.
    Returns (distance_km, duration_min) or None on failure.
    """
    base = getattr(settings, "OSRM_BASE_URL", None) or ""
    if not base:
        return None

    base = base.rstrip("/")
    coords = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    url = f"{base}/route/v1/driving/{coords}?overview=false"

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning("OSRM request failed: %s", e)
        return None

    if data.get("code") != "Ok":
        return None

    routes = data.get("routes", [])
    if not routes:
        return None

    route = routes[0]
    distance_m = route.get("distance", 0)
    duration_s = route.get("duration", 0)

    distance_km = round(distance_m / 1000.0, 2)
    duration_min = round(duration_s / 60.0, 2)
    return (distance_km, duration_min)
