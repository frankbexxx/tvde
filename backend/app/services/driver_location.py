from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.models.enums import Role, TripStatus


def upsert_driver_location(
    *,
    db: Session,
    driver_id: str,
    lat: float,
    lng: float,
    timestamp_ms: int,
) -> None:
    """Upsert last known location for a driver.

    Validation rules:
    - Latitude:  -90 <= lat <= 90
    - Longitude: -180 <= lng <= 180
    - Timestamp within ±1 hour of server time (to avoid bogus values).
    """
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found",
        )

    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_latitude",
        )
    if not (-180.0 <= lng <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_longitude",
        )

    ts = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = abs((ts - now).total_seconds())
    if delta > 3600:  # older/newer than 1 hour
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_timestamp",
        )

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
    user_id: str,
    role: Role,
    trip_id: str,
) -> tuple[float, float, datetime]:
    """
    Return the last known driver location for a given trip.

    - If role=passenger: validates that the passenger owns the trip.
    - If role=driver: validates that the driver is assigned to the trip.
    - Only returns location if the trip has an assigned driver and is active.
    """
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id)
    ).scalar_one_or_none()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    if role == Role.passenger:
        if str(trip.passenger_id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
    elif role == Role.driver:
        if not trip.driver_id or str(trip.driver_id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
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

