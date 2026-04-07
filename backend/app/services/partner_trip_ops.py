"""Partner-scoped trip operations (fleet manager)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.trip import Trip
from app.models.enums import DriverStatus, TripStatus
from app.services.partner_queries import get_driver_for_partner, get_trip_for_partner
from app.utils.logging import log_event


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
    t = get_trip_for_partner(db, partner_id, trip_id)
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
    old = get_driver_for_partner(db, partner_id, t.driver_id)
    if not old:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    new_d = get_driver_for_partner(db, partner_id, new_driver_user_id)
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
    db.commit()
    db.refresh(t)
    log_event(
        "partner_trip_reassign",
        trip_id=str(t.id),
        partner_id=partner_id,
        new_driver_id=str(new_driver_user_id),
    )
    return t
