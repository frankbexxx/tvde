"""PET-4 — passenger_count + vehicle max_passengers capacity helpers.

Matching / accept call sites must use these helpers; do not duplicate formulas.
Enforcement is gated by ``ENABLE_VEHICLE_CAPACITY_GATES`` (default OFF).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.vehicle import Vehicle

logger = logging.getLogger(__name__)

CODE_VEHICLE_CAPACITY_INSUFFICIENT = "vehicle_capacity_insufficient"

PASSENGER_COUNT_MIN = 1
PASSENGER_COUNT_MAX = 8
VEHICLE_MAX_PASSENGERS_MIN = 1
VEHICLE_MAX_PASSENGERS_MAX = 8


def vehicle_capacity_gates_enabled() -> bool:
    return bool(getattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", False))


def resolve_passenger_count(raw: Any) -> int:
    """Normalize create payload passenger_count; default 1 for old clients."""
    if raw is None:
        return 1
    try:
        n = int(raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="invalid_passenger_count",
        ) from exc
    if n < PASSENGER_COUNT_MIN or n > PASSENGER_COUNT_MAX:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="invalid_passenger_count",
        )
    return n


def validate_vehicle_max_passengers(raw: Any, *, required: bool) -> int | None:
    """Partner create/patch validation. None allowed on patch when unset."""
    if raw is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_passengers_required",
            )
        return None
    try:
        n = int(raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_max_passengers",
        ) from exc
    if n < VEHICLE_MAX_PASSENGERS_MIN or n > VEHICLE_MAX_PASSENGERS_MAX:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_max_passengers",
        )
    return n


def trip_passenger_count(trip: Trip | Any) -> int:
    raw = getattr(trip, "passenger_count", None)
    if raw is None:
        return 1
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return 1
    return max(PASSENGER_COUNT_MIN, n)


def occupied_pet_seats(trip: Trip | Any) -> int:
    """Seats taken by animal when Passenger marked occupies seat.

    Commercial pet and assistance both honour ``pet_occupies_seat``.
    """
    if not bool(getattr(trip, "pet_occupies_seat", False)):
        return 0
    if bool(getattr(trip, "has_pet", False)) or bool(
        getattr(trip, "is_assistance_animal", False)
    ):
        return 1
    return 0


def required_passenger_capacity(trip: Trip | Any) -> int:
    return trip_passenger_count(trip) + occupied_pet_seats(trip)


def vehicle_max_passengers(vehicle: Vehicle | Any | None) -> int | None:
    if vehicle is None:
        return None
    raw = getattr(vehicle, "max_passengers", None)
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def load_driver_active_vehicle(db: Session, driver: Driver | Any) -> Vehicle | None:
    vid = getattr(driver, "active_vehicle_id", None)
    if vid is None:
        return None
    return db.execute(select(Vehicle).where(Vehicle.id == vid)).scalar_one_or_none()


def driver_matches_trip_capacity(
    db: Session,
    driver: Driver | Any,
    trip: Trip | Any,
    *,
    vehicle: Vehicle | None = None,
) -> bool:
    """True when capacity gates OFF, or active vehicle has enough seats.

    When gates ON:
    - no active vehicle / missing vehicle row → False
    - max_passengers NULL (unknown) → False
    - max_passengers < required → False
    """
    if not vehicle_capacity_gates_enabled():
        return True
    veh = vehicle if vehicle is not None else load_driver_active_vehicle(db, driver)
    cap = vehicle_max_passengers(veh)
    if cap is None:
        return False
    return cap >= required_passenger_capacity(trip)


def assert_driver_matches_trip_capacity(
    db: Session,
    driver: Driver | Any,
    trip: Trip | Any,
    *,
    surface: str,
) -> None:
    if not vehicle_capacity_gates_enabled():
        return
    if driver_matches_trip_capacity(db, driver, trip):
        return
    logger.info(
        "vehicle_capacity_blocked",
        extra={
            "surface": surface,
            "trip_id": str(getattr(trip, "id", "")),
            "driver_id": str(getattr(driver, "user_id", "")),
            "required": required_passenger_capacity(trip),
            "active_vehicle_id": str(getattr(driver, "active_vehicle_id", None)),
        },
    )
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=CODE_VEHICLE_CAPACITY_INSUFFICIENT,
    )


def batch_filter_drivers_by_capacity(
    db: Session,
    trip: Trip | Any,
    drivers: list[tuple[Driver, float]],
) -> list[tuple[Driver, float]]:
    """Soft-filter for dispatch. Flag OFF → passthrough."""
    if not vehicle_capacity_gates_enabled() or not drivers:
        return drivers
    vehicle_ids = [
        d.active_vehicle_id for d, _ in drivers if getattr(d, "active_vehicle_id", None)
    ]
    vehicles_by_id: dict[uuid.UUID, Vehicle] = {}
    if vehicle_ids:
        rows = db.execute(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).scalars()
        vehicles_by_id = {v.id: v for v in rows}

    kept: list[tuple[Driver, float]] = []
    dropped = 0
    for driver, dist in drivers:
        vid = getattr(driver, "active_vehicle_id", None)
        veh = vehicles_by_id.get(vid) if vid else None
        if driver_matches_trip_capacity(db, driver, trip, vehicle=veh):
            kept.append((driver, dist))
        else:
            dropped += 1
    if dropped:
        logger.info(
            "vehicle_capacity_filtered",
            extra={
                "trip_id": str(getattr(trip, "id", "")),
                "dropped": dropped,
                "kept": len(kept),
                "required": required_passenger_capacity(trip),
            },
        )
    return kept
