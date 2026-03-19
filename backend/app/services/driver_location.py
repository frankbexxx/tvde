from __future__ import annotations

from datetime import datetime, timezone
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.utils.logging import log_debug_event, log_event
from app.utils.state_machine import validate_trip_transition
from app.db.models.trip import Trip
from app.models.enums import DriverStatus, Role, TripStatus


logger = logging.getLogger(__name__)


def _ensure_driver_profile(db: Session, driver_id: str) -> Driver:
    """
    Ensure a Driver profile exists for the given user_id.

    In BETA/dev environments we are lenient: if a user has a driver token but
    no Driver row yet, we auto-create an approved driver profile so that
    tracking and matching work without manual admin intervention.
    """
    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if driver:
        return driver

    if getattr(settings, "BETA_MODE", False):
        driver = Driver(
            user_id=driver_id,
            status=DriverStatus.approved,
            commission_percent=15,
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="driver_not_found",
    )


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
    driver = _ensure_driver_profile(db, driver_id)

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
        select(DriverLocation)
        .where(DriverLocation.driver_id == driver_id)
        .limit(1)
    ).scalar_one_or_none()
    is_first_send = loc is None
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

    log_event("driver_location_update", driver_id=driver_id, lat=lat, lng=lng)
    if is_first_send:
        log_event("driver_location_first_send", driver_id=driver_id, lat=lat, lng=lng)

    # Broadcast to trip subscribers when driver has an active trip
    active_trip = db.execute(
        select(Trip)
        .where(Trip.driver_id == driver_id)
        .where(Trip.status.in_([TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing]))
        .limit(1)
    ).scalar_one_or_none()
    if active_trip:
        log_debug_event(
            "driver_location_updated",
            trip_id=str(active_trip.id),
            driver_id=driver_id,
            lat=lat,
            lng=lng,
        )
        from app.realtime.hub import hub
        hub.publish_driver_location(
            trip_id=str(active_trip.id),
            lat=lat,
            lng=lng,
            timestamp=ts,
        )

    # Fallback auto-dispatch for BETA/dev: when multi-offer created 0 offers
    # (no drivers had locations). Assign oldest requested trip to pool.
    from app.db.models.trip_offer import TripOffer
    beta_mode = getattr(settings, "BETA_MODE", False)
    if beta_mode and getattr(driver, "is_available", True):
        # Only assign trips that have no offers (multi-offer missed them)
        ids_with_offers = {
            row[0] for row in
            db.execute(select(TripOffer.trip_id).distinct()).all()
        }
        q = (
            select(Trip)
            .where(Trip.status == TripStatus.requested)
            .order_by(Trip.created_at.asc())
        )
        if ids_with_offers:
            q = q.where(Trip.id.notin_(ids_with_offers))
        trip = db.execute(q).scalars().first()
        if trip is not None:
            previous_status = trip.status
            validate_trip_transition(previous_status, TripStatus.assigned, trip_id=str(trip.id))
            trip.status = TripStatus.assigned
            log_event(
                "trip_auto_dispatched",
                trip_id=trip.id,
                driver_id=driver_id,
            )
            logger.info(
                "upsert_driver_location: auto-dispatch trip",
                extra={
                    "trip_id": str(trip.id),
                    "previous_status": previous_status.value,
                    "new_status": trip.status.value,
                    "driver_id": str(driver_id),
                    "beta_mode": beta_mode,
                },
            )
        else:
            logger.info(
                "upsert_driver_location: no requested trips to assign",
                extra={
                    "driver_id": str(driver_id),
                    "beta_mode": beta_mode,
                },
            )

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
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip:
        logger.info(
            "get_driver_location_for_trip: trip not found",
            extra={"trip_id": str(trip_id), "user_id": str(user_id), "role": role.value},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    # In closed BETA we relax strict ownership checks to simplify multi-device testing
    # (different phones for passenger/driver, shared tokens in the web app, etc.).
    # In non-BETA environments keep the original strict rules.
    beta_mode = getattr(settings, "BETA_MODE", False)
    if not beta_mode:
        if role == Role.passenger:
            if str(trip.passenger_id) != str(user_id):
                logger.info(
                    "get_driver_location_for_trip: forbidden passenger access",
                    extra={
                        "trip_id": str(trip_id),
                        "user_id": str(user_id),
                        "role": role.value,
                        "trip_passenger_id": str(trip.passenger_id),
                        "trip_driver_id": str(trip.driver_id) if trip.driver_id else None,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="forbidden_trip_access",
                )
        elif role == Role.driver:
            if not trip.driver_id or str(trip.driver_id) != str(user_id):
                logger.info(
                    "get_driver_location_for_trip: forbidden driver access",
                    extra={
                        "trip_id": str(trip_id),
                        "user_id": str(user_id),
                        "role": role.value,
                        "trip_passenger_id": str(trip.passenger_id),
                        "trip_driver_id": str(trip.driver_id) if trip.driver_id else None,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="forbidden_trip_access",
                )
    else:
        # BETA: still block clearly unrelated passengers, but allow either the
        # real passenger or the assigned driver, regardless of token role.
        if (
            str(trip.passenger_id) != str(user_id)
            and (not trip.driver_id or str(trip.driver_id) != str(user_id))
        ):
            logger.info(
                "get_driver_location_for_trip: forbidden beta access",
                extra={
                    "trip_id": str(trip_id),
                    "user_id": str(user_id),
                    "role": role.value,
                    "trip_passenger_id": str(trip.passenger_id),
                    "trip_driver_id": str(trip.driver_id) if trip.driver_id else None,
                    "beta_mode": beta_mode,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )

    if not trip.driver_id:
        logger.info(
            "get_driver_location_for_trip: driver not assigned",
            extra={
                "trip_id": str(trip_id),
                "user_id": str(user_id),
                "role": role.value,
                "trip_passenger_id": str(trip.passenger_id),
                "trip_status": trip.status.value,
            },
        )
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

    log_event("driver_location_requested", trip_id=trip_id, user_id=user_id)
    return float(loc.lat), float(loc.lng), loc.timestamp

