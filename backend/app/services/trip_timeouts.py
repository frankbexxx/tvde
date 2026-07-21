"""
Trip timeouts — automatic state transitions for stuck trips.
Read-only + state updates only. No Stripe interaction.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

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
            .values(status=TripStatus.requested, driver_id=None)
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
    accepted_stuck = (
        db.execute(
            select(Trip)
            .where(Trip.status == TripStatus.accepted)
            .where(Trip.updated_at < accepted_cutoff)
        )
        .scalars()
        .all()
    )
    for trip in accepted_stuck:
        driver_id = trip.driver_id
        trip.status = TripStatus.cancelled
        _set_driver_available(db, str(driver_id) if driver_id else None)
        counts["accepted_to_cancelled"] += 1
        logger.info(
            f"trip_timeouts: accepted→cancelled trip_id={trip.id}, "
            f"driver_id={driver_id}, updated_at={trip.updated_at}"
        )
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip.id),
                status=trip.status,
                timestamp=now,
            )
        )

    # 3) ongoing > 6 hours → failed, free driver
    ongoing_stuck = (
        db.execute(
            select(Trip)
            .where(Trip.status == TripStatus.ongoing)
            .where(Trip.started_at.isnot(None))
            .where(Trip.started_at < ongoing_cutoff)
        )
        .scalars()
        .all()
    )
    for trip in ongoing_stuck:
        driver_id = trip.driver_id
        old_status = trip.status
        trip.status = TripStatus.failed
        on_trip_status_change_for_driving_compliance(db, trip, old_status, trip.status)
        _set_driver_available(db, str(driver_id) if driver_id else None)
        counts["ongoing_to_failed"] += 1
        logger.info(
            f"trip_timeouts: ongoing→failed trip_id={trip.id}, "
            f"driver_id={driver_id}, started_at={trip.started_at}"
        )
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip.id),
                status=trip.status,
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
