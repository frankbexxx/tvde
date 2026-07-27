"""Partner fleet mutations — driver enable/disable and forced availability (tenant-scoped)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip_offer import TripOffer
from app.models.enums import DriverStatus, OfferStatus
from app.services.trips import driver_has_active_assigned_trip
from app.services.vehicle_compliance_gate import (
    evaluate_driver_vehicle_compliance_gate,
)
from app.utils.logging import log_event


def set_partner_driver_enabled(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    enabled: bool,
) -> Driver:
    """
    Enable/disable driver for fleet operations: approved vs rejected.
    Does not approve drivers still pending (admin flow).

    Disable also clears dispatch eligibility and expires outstanding pending
    offers so a stale accept cannot create Payment after partner disable.

    Offer expiry runs in a *second* transaction after the Driver status commit.
    Mutating offers while still holding Driver FOR UPDATE deadlocks with
    accept_offer (Offer → Trip → Driver): accept holds the offer row and waits
    for Driver, while disable holds Driver and waits to UPDATE the offer.
    PostgreSQL then aborts disable; accept proceeds and creates Payment while
    the driver remains approved. The approved check under Driver lock is the
    hard gate; conditional offer expiry is best-effort cleanup afterward.
    """
    pid = uuid.UUID(partner_id)
    # Lock Driver so a concurrent accept cannot pass an approved check and then
    # lose to a disable that only flipped status without serializing on the row.
    d = db.execute(
        select(Driver)
        .where(Driver.user_id == driver_user_id, Driver.partner_id == pid)
        .with_for_update(of=Driver)
    ).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if d.status == DriverStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_change_pending_status",
        )
    if enabled:
        d.status = DriverStatus.approved
        db.commit()
        db.refresh(d)
        return d

    d.status = DriverStatus.rejected
    d.is_available = False
    # Commit Driver status *before* touching offers so we never hold Driver and
    # need an offer row lock in the same transaction as accept_offer.
    db.commit()
    db.refresh(d)

    now = datetime.now(timezone.utc)
    # WHERE status=pending: never clobber an offer accept already committed.
    db.execute(
        update(TripOffer)
        .where(
            TripOffer.driver_id == driver_user_id,
            TripOffer.status == OfferStatus.pending,
        )
        .values(status=OfferStatus.expired, expires_at=now)
    )
    db.commit()
    return d


def set_partner_driver_availability(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    online: bool,
) -> Driver:
    """Force driver online (available) or offline without touching core trip logic."""
    # Lock the Driver row before availability checks so a concurrent accept
    # cannot commit is_available=False + active trip and then be overwritten
    # back to True by a stale force-online write (TOCTOU double-book).
    pid = uuid.UUID(partner_id)
    d = db.execute(
        select(Driver)
        .where(Driver.user_id == driver_user_id, Driver.partner_id == pid)
        .with_for_update(of=Driver)
    ).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if d.status != DriverStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="driver_not_approved",
        )
    if online:
        # Match admin recover-driver / driver go_online: never restore dispatch
        # eligibility while an accepted/arriving/ongoing trip is still live.
        if driver_has_active_assigned_trip(db=db, driver_user_id=str(d.user_id)):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="driver_has_active_trip",
            )
        gate = evaluate_driver_vehicle_compliance_gate(db, d)
        if not gate.allowed:
            log_event(
                "vehicle_compliance_gate_blocked",
                surface="partner_force_online",
                partner_id=str(pid),
                driver_id=str(d.user_id),
                code=gate.code,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=gate.code,
            )
    d.is_available = online
    db.commit()
    db.refresh(d)
    return d
