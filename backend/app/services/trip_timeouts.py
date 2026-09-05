"""
Trip timeouts — automatic state transitions for stuck trips.
Read-only + state updates only. No Stripe interaction.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db.models.trip import Trip
from app.events.dispatcher import emit
from app.models.enums import TripStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.services.trips import (
    _set_driver_available,
    on_trip_status_change_for_driving_compliance,
)
from app.utils.logging import log_event

logger = logging.getLogger(__name__)

ASSIGNED_TIMEOUT_MINUTES = 2
ACCEPTED_TIMEOUT_MINUTES = 10
ONGOING_TIMEOUT_HOURS = 6


def run_trip_timeouts(db: Session) -> dict[str, int]:
    """
    Apply timeout rules to stuck trips. Returns counts of actions taken.
    No Stripe interaction.

    Accepted/ongoing transitions use conditional UPDATE … WHERE status=…
    RETURNING so concurrent mark_arriving / start_trip / complete_trip
    (which lock the trip row) cannot be overwritten by a stale timeout
    mutate after they commit a newer state.
    """
    now = datetime.now(timezone.utc)
    assigned_cutoff = now - timedelta(minutes=ASSIGNED_TIMEOUT_MINUTES)
    accepted_cutoff = now - timedelta(minutes=ACCEPTED_TIMEOUT_MINUTES)
    ongoing_cutoff = now - timedelta(hours=ONGOING_TIMEOUT_HOURS)

    counts: dict[str, int] = {
        "assigned_to_requested": 0,
        "accepted_to_cancelled": 0,
        "ongoing_to_failed": 0,
    }
    pending_events: list[TripStatusChangedEvent] = []

    # 1) assigned > 2 min → requested
    assigned_stuck_ids = (
        db.execute(
            update(Trip)
            .where(
                Trip.status == TripStatus.assigned,
                Trip.updated_at < assigned_cutoff,
            )
            .values(
                status=TripStatus.requested,
                driver_id=None,
                partner_id=None,
                vehicle_id=None,
                vehicle_plate=None,
                updated_at=func.now(),
            )
            .returning(Trip.id)
            .execution_options(synchronize_session=False)
        )
        .scalars()
        .all()
    )
    for trip_id in assigned_stuck_ids:
        counts["assigned_to_requested"] += 1
        logger.info("trip_timeouts: assigned→requested trip_id=%s", trip_id)
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip_id),
                status=TripStatus.requested,
                timestamp=now,
            )
        )

    # 2) accepted > 10 min without start → cancelled, free driver
    # Conditional UPDATE: do not clobber a concurrent accepted→arriving transition.
    accepted_stuck = db.execute(
        update(Trip)
        .where(
            Trip.status == TripStatus.accepted,
            Trip.updated_at < accepted_cutoff,
        )
        .values(status=TripStatus.cancelled, updated_at=func.now())
        .returning(Trip.id, Trip.driver_id)
        .execution_options(synchronize_session=False)
    ).all()
    for trip_id, driver_id in accepted_stuck:
        _set_driver_available(db, str(driver_id) if driver_id else None)
        counts["accepted_to_cancelled"] += 1
        logger.info(
            "trip_timeouts: accepted→cancelled trip_id=%s, driver_id=%s",
            trip_id,
            driver_id,
        )
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip_id),
                status=TripStatus.cancelled,
                timestamp=now,
            )
        )

    # 3) ongoing > 6 hours → failed, free driver
    # Conditional UPDATE: do not clobber a concurrent ongoing→completed settlement.
    ongoing_stuck = db.execute(
        update(Trip)
        .where(
            Trip.status == TripStatus.ongoing,
            Trip.started_at.isnot(None),
            Trip.started_at < ongoing_cutoff,
        )
        .values(status=TripStatus.failed, updated_at=func.now())
        .returning(Trip.id, Trip.driver_id)
        .execution_options(synchronize_session=False)
    ).all()
    for trip_id, driver_id in ongoing_stuck:
        # Compliance helpers need a Trip instance; load after the conditional write.
        trip = db.get(Trip, trip_id)
        if trip is not None:
            # Identity map may still show pre-UPDATE status with synchronize_session=False.
            db.expire(trip)
            trip = db.get(Trip, trip_id)
        if trip is not None:
            on_trip_status_change_for_driving_compliance(
                db, trip, TripStatus.ongoing, TripStatus.failed
            )
        _set_driver_available(db, str(driver_id) if driver_id else None)
        counts["ongoing_to_failed"] += 1
        logger.info(
            "trip_timeouts: ongoing→failed trip_id=%s, driver_id=%s",
            trip_id,
            driver_id,
        )
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip_id),
                status=TripStatus.failed,
                timestamp=now,
            )
        )

    if any(c > 0 for c in counts.values()):
        db.commit()
        log_event(
            "trip_timeouts_applied",
            assigned_to_requested=counts["assigned_to_requested"],
            accepted_to_cancelled=counts["accepted_to_cancelled"],
            ongoing_to_failed=counts["ongoing_to_failed"],
        )
        for ev in pending_events:
            emit(ev)

    return counts
