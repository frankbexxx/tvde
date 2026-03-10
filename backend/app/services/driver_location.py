from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.models.enums import TripStatus


def upsert_driver_location(
    *,
    db: Session,
    driver_id: str,
    lat: float,
    lng: float,
    timestamp_ms: int,
) -> None:
    """Upsert last known location for a driver."""
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found",
        )

    ts = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_id)
    ).scalar_one_or_none()
    if loc is None:
        loc = DriverLocation(
            driver_id=driver_id,
            lat=lat,
            lng=lng,
            timestamp=ts,
        )
        db.add(loc)
    else:
        loc.lat = lat
        loc.lng = lng
        loc.timestamp = ts

    db.commit()


def get_driver_location_for_trip(
    *,
    db: Session,
    passenger_id: str,
    trip_id: str,
) -> tuple[float, float, datetime]:
    """
    Return the last known driver location for a given trip.

    - Validates that the passenger owns the trip.
    - Only returns location if the trip has an assigned driver and is active.
    """
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id)
    ).scalar_one_or_none()
    if not trip or str(trip.passenger_id) != str(passenger_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    if not trip.driver_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_assigned",
        )

    if trip.status not in {
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"trip_not_active_for_location_{trip.status.value}",
        )

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == trip.driver_id)
    ).scalar_one_or_none()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_location_not_found",
        )

    return float(loc.lat), float(loc.lng), loc.timestamp

