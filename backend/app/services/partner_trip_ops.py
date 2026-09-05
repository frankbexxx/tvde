"""Partner-scoped trip operations (fleet manager)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.models.enums import DriverStatus, TripStatus
from app.services.activity_retention import stamp_trip_activity_context
from app.utils.logging import log_event


def _lock_partner_drivers(
    db: Session,
    *,
    partner_id: uuid.UUID,
    driver_user_ids: set[uuid.UUID],
) -> dict[uuid.UUID, Driver]:
    """Lock drivers in a stable order so fleet transfers cannot pass stale checks."""
    rows = (
        db.execute(
            select(Driver)
            .where(
                Driver.user_id.in_(driver_user_ids),
                Driver.partner_id == partner_id,
            )
            .order_by(Driver.user_id)
            .with_for_update(of=Driver)
        )
        .scalars()
        .all()
    )
    return {row.user_id: row for row in rows}


def partner_reassign_trip_driver(
    db: Session,
    *,
    partner_id: str,
    trip_id: uuid.UUID,
    new_driver_user_id: uuid.UUID,
) -> Trip:
    """
    Swap assigned driver for another driver in the same fleet.
    Trip must be in assigned; both drivers must belong to this partner.
    """
    pid = uuid.UUID(partner_id)
    t = db.execute(
        select(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .where(Trip.id == trip_id, Driver.partner_id == pid)
        .with_for_update(of=Trip)
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if t.status != TripStatus.assigned:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="trip_not_assigned",
        )
    if t.driver_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="trip_has_no_driver",
        )
    old_driver_user_id = t.driver_id
    locked_drivers = _lock_partner_drivers(
        db,
        partner_id=pid,
        driver_user_ids={old_driver_user_id, new_driver_user_id},
    )
    old = locked_drivers.get(old_driver_user_id)
    if not old:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    new_d = locked_drivers.get(new_driver_user_id)
    if not new_d or new_d.status != DriverStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_driver",
        )
    if new_driver_user_id == t.driver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="same_driver",
        )
    t.driver_id = new_driver_user_id
    stamp_trip_activity_context(db, t, new_d)
    db.commit()
    db.refresh(t)
    log_event(
        "partner_trip_reassign",
        trip_id=str(t.id),
        partner_id=partner_id,
        new_driver_id=str(new_driver_user_id),
    )
    return t
