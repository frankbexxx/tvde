"""
Temporary debug routes for map/driver tracking diagnostics.
All endpoints return 404 when ENV != "dev" and ENABLE_DEV_TOOLS is false.
"""
import uuid

from app.utils.logging import get_recent_trip_logs, get_trip_summary
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, get_current_user, require_role
from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.models.enums import DriverStatus, Role
from app.utils.geo import haversine_km


def _require_dev() -> None:
    if settings.ENV != "dev" and not getattr(settings, "ENABLE_DEV_TOOLS", False):
        raise HTTPException(status_code=404)


def _require_dev_or_beta() -> None:
    """Allow debug endpoints when ENABLE_DEV_TOOLS or BETA_MODE."""
    if not (
        settings.ENV == "dev"
        or getattr(settings, "ENABLE_DEV_TOOLS", False)
        or getattr(settings, "BETA_MODE", False)
    ):
        raise HTTPException(status_code=404, detail="debug_not_available")


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


@router.get("/trip-matching/{trip_id}")
async def debug_trip_matching(
    trip_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Diagnose why a trip has no driver. Call with passenger token (owner of trip).
    Returns: drivers_with_location, drivers_in_radius, offers_created, root_cause.
    """
    _require_dev_or_beta()
    try:
        tid = uuid.UUID(trip_id.strip())
    except ValueError:
        return {"error": "invalid_trip_id", "trip_id": trip_id}
    trip = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    if not trip:
        return {"error": "trip_not_found", "trip_id": trip_id}
    if str(trip.passenger_id) != str(user.user_id):
        raise HTTPException(status_code=403, detail="forbidden_trip_access")

    radius_km = settings.GEO_RADIUS_KM
    origin_lat = float(trip.origin_lat)
    origin_lng = float(trip.origin_lng)

    drivers_with_loc = list(
        db.execute(
            select(Driver, DriverLocation)
            .join(DriverLocation, DriverLocation.driver_id == Driver.user_id)
            .where(Driver.status == DriverStatus.approved)
            .where(Driver.is_available)
        ).all()
    )

    step1 = [
        {
            "driver_id": str(d.user_id),
            "lat": float(loc.lat),
            "lng": float(loc.lng),
            "is_available": d.is_available,
            "status": d.status.value,
        }
        for d, loc in drivers_with_loc
    ]

    candidates: list[dict] = []
    for driver, loc in drivers_with_loc:
        dist = haversine_km(origin_lat, origin_lng, float(loc.lat), float(loc.lng))
        if dist <= radius_km:
            candidates.append({"driver_id": str(driver.user_id), "distance_km": round(dist, 2)})
    candidates.sort(key=lambda x: x["distance_km"])

    offers = list(
        db.execute(
            select(TripOffer).where(TripOffer.trip_id == trip.id)
        ).scalars().all()
    )
    now = datetime.now(timezone.utc)
    step3 = [
        {
            "offer_id": str(o.id),
            "driver_id": str(o.driver_id),
            "status": o.status.value,
            "expires_at": o.expires_at.isoformat() if o.expires_at else None,
            "expired": o.expires_at < now if o.expires_at else False,
        }
        for o in offers
    ]

    if len(step1) == 0:
        root_cause = "ZERO_OFFERS: 0 drivers with location and is_available=true"
    elif len(candidates) == 0:
        root_cause = f"ZERO_OFFERS: {len(step1)} drivers with location but 0 within {radius_km}km of trip origin"
    elif len(step3) == 0:
        root_cause = "ZERO_OFFERS: drivers in radius but no offers in DB (bug or offers expired)"
    else:
        pending = [o for o in step3 if o["status"] == "pending" and not o.get("expired")]
        root_cause = f"OK: {len(pending)} pending offers"
        if len(pending) == 0:
            root_cause = f"ZERO_OFFERS: {len(step3)} offers exist but all expired or taken"

    return {
        "trip_id": str(trip.id),
        "trip_status": trip.status.value,
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "radius_km": radius_km,
        "step_1_drivers_with_location": {"count": len(step1), "list": step1},
        "step_2_drivers_in_radius": {"count": len(candidates), "list": candidates[:10]},
        "step_3_offers": {"count": len(step3), "list": step3},
        "root_cause": root_cause,
    }


@router.get("/trip/{trip_id}/logs")
async def debug_trip_logs(trip_id: str) -> dict:
    """
    Return recent in-memory log lines for a trip (A007 buffer).
    Dev only. Max 50 events per trip.
    """
    _require_dev_or_beta()
    logs_list = get_recent_trip_logs(trip_id.strip())
    return {"trip_id": trip_id, "logs": logs_list, "count": len(logs_list)}


@router.get("/trip/{trip_id}/summary")
async def debug_trip_summary(trip_id: str) -> dict:
    """
    Return trip summary: time_to_assign, time_to_accept, time_to_start, events_count.
    A008. Dev only.
    """
    _require_dev_or_beta()
    return get_trip_summary(trip_id.strip())


@router.get("/driver-eligibility")
async def debug_driver_eligibility(
    db: Session = Depends(get_db),
    user: UserContext = Depends(require_role(Role.driver)),
) -> dict[str, Any]:
    """
    Diagnose why a driver sees no trips. Call with driver token.
    Returns: has_location, is_available, pending_offers, root_cause.
    """
    _require_dev_or_beta()
    driver_id = str(user.user_id)
    try:
        driver_uuid = uuid.UUID(driver_id)
    except ValueError:
        return {"error": "invalid_user_id", "driver_id": driver_id}
    driver = db.execute(select(Driver).where(Driver.user_id == driver_uuid)).scalar_one_or_none()
    if not driver:
        return {
            "driver_id": driver_id,
            "has_driver_profile": False,
            "root_cause": "NO_PROFILE: driver has no Driver row (not approved or never sent location)",
        }

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_uuid)
    ).scalar_one_or_none()

    if not loc:
        return {
            "driver_id": driver_id,
            "has_driver_profile": True,
            "has_location": False,
            "is_available": driver.is_available,
            "status": driver.status.value,
            "root_cause": "NO_LOCATION: driver has no DriverLocation row (never sent POST /drivers/location)",
        }

    from app.services.trips import list_offers_for_driver

    offers = list_offers_for_driver(db=db, driver_id=driver_id)
    pending = [(o, t) for o, t in offers]

    if not driver.is_available:
        root_cause = "OFFLINE: is_available=false (driver must be 'Disponível' not 'Offline')"
    elif driver.status != DriverStatus.approved:
        root_cause = f"NOT_APPROVED: driver status={driver.status.value}"
    elif len(pending) == 0:
        root_cause = "NO_OFFERS: 0 pending offers for this driver (create_offers_for_trip did not include this driver)"
    else:
        root_cause = f"OK: {len(pending)} pending offers"

    return {
        "driver_id": driver_id,
        "has_driver_profile": True,
        "has_location": True,
        "location": {"lat": float(loc.lat), "lng": float(loc.lng)},
        "is_available": driver.is_available,
        "status": driver.status.value,
        "pending_offers_count": len(pending),
        "pending_offers": [
            {"offer_id": str(o.id), "trip_id": str(t.id), "expires_at": o.expires_at.isoformat() if o.expires_at else None}
            for o, t in pending[:5]
        ],
        "root_cause": root_cause,
    }
