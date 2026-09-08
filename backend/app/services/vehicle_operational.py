"""G-KYC-P0-03 — Vehicle ``active``/``inactive`` gate for *new* trip operations.

Always on (not behind ``ENABLE_VEHICLE_COMPLIANCE_GATES``).

Policy:
- No ``active_vehicle_id`` → allowed (preserve pre-existing no-vehicle behaviour).
- Vehicle row missing → treated as no vehicle → allowed.
- ``status != active`` → block new offers / accept / go-online eligibility.
- Does **not** cancel or fail trips already accepted/arriving/ongoing.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.vehicle import Vehicle
from app.utils.logging import log_event

CODE_VEHICLE_INACTIVE = "vehicle_inactive"
_ACTIVE = "active"


def evaluate_driver_vehicle_operational(
    db: Session,
    driver: Driver,
) -> tuple[bool, str | None, str | None]:
    """
    Returns ``(allowed, code, vehicle_id)``.

    ``code`` is ``vehicle_inactive`` when blocked; otherwise ``None``.
    """
    avid = driver.active_vehicle_id
    if avid is None:
        return True, None, None
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.id == avid)
    ).scalar_one_or_none()
    if vehicle is None:
        return True, None, str(avid)
    if (vehicle.status or "").strip().lower() != _ACTIVE:
        return False, CODE_VEHICLE_INACTIVE, str(vehicle.id)
    return True, None, str(vehicle.id)


def driver_vehicle_allows_new_ops(db: Session, driver: Driver) -> bool:
    allowed, _code, _vid = evaluate_driver_vehicle_operational(db, driver)
    return allowed


def assert_driver_vehicle_operational_for_new_ops(
    db: Session,
    driver: Driver,
    *,
    surface: str,
    trip_id: str | None = None,
) -> None:
    """Raise 409 ``vehicle_inactive`` when the assigned vehicle is not active."""
    allowed, code, vehicle_id = evaluate_driver_vehicle_operational(db, driver)
    if allowed:
        return
    fields: dict = {
        "surface": surface,
        "driver_id": str(driver.user_id),
        "code": code,
        "vehicle_id": vehicle_id,
    }
    if trip_id:
        fields["trip_id"] = trip_id
    log_event("vehicle_operational_blocked", **fields)
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=CODE_VEHICLE_INACTIVE,
    )


def batch_driver_ids_blocked_by_inactive_vehicle(
    db: Session,
    drivers: list[Driver],
) -> set[uuid.UUID]:
    """Drivers whose assigned vehicle is present and not ``active``."""
    avid_list = [d.active_vehicle_id for d in drivers if d.active_vehicle_id is not None]
    if not avid_list:
        return set()
    rows = (
        db.execute(select(Vehicle.id, Vehicle.status).where(Vehicle.id.in_(avid_list)))
        .all()
    )
    inactive_ids = {
        vid
        for vid, st in rows
        if (st or "").strip().lower() != _ACTIVE
    }
    blocked: set[uuid.UUID] = set()
    for d in drivers:
        if d.active_vehicle_id is not None and d.active_vehicle_id in inactive_ids:
            blocked.add(d.user_id)
    return blocked
