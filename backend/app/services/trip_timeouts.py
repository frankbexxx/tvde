"""
Trip timeouts — automatic state transitions for stuck trips.

Real PaymentIntents: cancel via shared L-PAY-03 helper before local timeout.
Stripe failure → skip that trip (fail-closed), continue the batch.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func

from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.events.dispatcher import emit
from app.models.enums import PaymentStatus, TripStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.services.trips import (
    PI_CANCEL_FAILED,
    _MOCK_PI_PREFIX,
    _set_driver_available,
    cancel_real_payment_intent_if_needed,
    fail_mock_processing_payment_on_cancel,
    on_trip_status_change_for_driving_compliance,
)
from app.utils.logging import log_event

logger = logging.getLogger(__name__)

ASSIGNED_TIMEOUT_MINUTES = 2
ACCEPTED_TIMEOUT_MINUTES = 10
ONGOING_TIMEOUT_HOURS = 6


def _is_mock_processing_payment(payment: Payment | None) -> bool:
    if payment is None:
        return False
    if payment.status != PaymentStatus.processing:
        return False
    pi_id = (payment.stripe_payment_intent_id or "").strip()
    return pi_id.startswith(_MOCK_PI_PREFIX)


def _lock_stale_trip(
    db: Session,
    *,
    trip_id,
    expected_status: TripStatus,
    accepted_cutoff: datetime | None = None,
    ongoing_cutoff: datetime | None = None,
) -> Trip | None:
    """
    Lock one candidate trip row and re-validate timeout eligibility.

    Lock is held through the subsequent Stripe call on purpose: canceling a PI
    then discovering the trip already moved (arriving/completed) would orphan
    payment state. Concurrent complete/cancel block on this lock (same as
    manual cancel / previous conditional UPDATE wait).
    """
    trip = db.execute(
        select(Trip)
        .where(Trip.id == trip_id)
        .options(joinedload(Trip.payment))
        .with_for_update(of=Trip)
    ).scalar_one_or_none()
    if trip is None:
        return None
    if trip.status != expected_status:
        return None
    if expected_status == TripStatus.accepted:
        if accepted_cutoff is None or trip.updated_at is None:
            return None
        updated = trip.updated_at
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
        if updated >= accepted_cutoff:
            return None
    if expected_status == TripStatus.ongoing:
        if ongoing_cutoff is None or trip.started_at is None:
            return None
        started = trip.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        if started >= ongoing_cutoff:
            return None
    return trip


def _release_lock_without_changes(db: Session) -> None:
    """Drop FOR UPDATE without applying timeout mutations."""
    db.rollback()


def _apply_accepted_timeout(
    db: Session,
    trip: Trip,
    *,
    now: datetime,
) -> TripStatusChangedEvent:
    driver_id = trip.driver_id
    payment = trip.payment
    trip.status = TripStatus.cancelled
    trip.updated_at = now
    fail_mock_processing_payment_on_cancel(payment)
    _set_driver_available(db, str(driver_id) if driver_id else None)
    db.commit()
    logger.info(
        "trip_timeouts: accepted→cancelled trip_id=%s, driver_id=%s",
        trip.id,
        driver_id,
    )
    return TripStatusChangedEvent(
        trip_id=str(trip.id),
        status=TripStatus.cancelled,
        timestamp=now,
    )


def _apply_ongoing_timeout(
    db: Session,
    trip: Trip,
    *,
    now: datetime,
) -> TripStatusChangedEvent:
    driver_id = trip.driver_id
    payment = trip.payment
    old_status = TripStatus.ongoing
    trip.status = TripStatus.failed
    trip.updated_at = now
    fail_mock_processing_payment_on_cancel(payment)
    on_trip_status_change_for_driving_compliance(
        db, trip, old_status, TripStatus.failed
    )
    _set_driver_available(db, str(driver_id) if driver_id else None)
    db.commit()
    logger.info(
        "trip_timeouts: ongoing→failed trip_id=%s, driver_id=%s",
        trip.id,
        driver_id,
    )
    return TripStatusChangedEvent(
        trip_id=str(trip.id),
        status=TripStatus.failed,
        timestamp=now,
    )


def _timeout_payment_gate(
    db: Session,
    trip: Trip,
    *,
    action: str,
) -> bool:
    """
    Cancel real cancelable PI before local timeout.

    Returns True if local timeout may proceed.
    On Stripe failure: rollback (release lock), log, return False.
    """
    payment = trip.payment
    outcome = cancel_real_payment_intent_if_needed(payment, action=action)
    if outcome != PI_CANCEL_FAILED:
        return True

    pi_id = ""
    if payment is not None:
        pi_id = (payment.stripe_payment_intent_id or "").strip()
    log_event(
        "timeout_payment_cancel_failed",
        trip_id=str(trip.id),
        payment_intent_id=pi_id,
        action=action,
    )
    logger.error(
        "trip_timeouts: Stripe PI cancel failed; skipping timeout trip_id=%s pi=%s",
        trip.id,
        pi_id or "-",
    )
    _release_lock_without_changes(db)
    return False


def run_trip_timeouts(db: Session) -> dict[str, int]:
    """
    Apply timeout rules to stuck trips. Returns counts of actions taken.

    accepted→cancelled / ongoing→failed: per-trip FOR UPDATE, then shared
    Stripe cancel helper, then local transition. Stripe failure skips that
    trip only (no status change, no driver free) and continues the batch.

    Transaction notes:
    - assigned→requested stays bulk + one commit (no payment gate).
    - accepted/ongoing commit per successful trip so a later Stripe failure
      ``rollback`` cannot undo earlier timeouts.
    - Row lock is held during Stripe (see ``_lock_stale_trip``) to avoid
      canceling a PI for a trip that concurrently completes/cancels/arrives.
    """
    now = datetime.now(timezone.utc)
    assigned_cutoff = now - timedelta(minutes=ASSIGNED_TIMEOUT_MINUTES)
    accepted_cutoff = now - timedelta(minutes=ACCEPTED_TIMEOUT_MINUTES)
    ongoing_cutoff = now - timedelta(hours=ONGOING_TIMEOUT_HOURS)

    counts: dict[str, int] = {
        "assigned_to_requested": 0,
        "accepted_to_cancelled": 0,
        "ongoing_to_failed": 0,
        "mock_payments_failed": 0,
        "timeout_payment_cancel_failed": 0,
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

    if counts["assigned_to_requested"] > 0:
        db.commit()
        for ev in pending_events:
            emit(ev)
        pending_events.clear()

    # 2) accepted > 10 min without start → cancelled, free driver
    accepted_ids = (
        db.execute(
            select(Trip.id).where(
                Trip.status == TripStatus.accepted,
                Trip.updated_at < accepted_cutoff,
            )
        )
        .scalars()
        .all()
    )
    for trip_id in accepted_ids:
        trip = _lock_stale_trip(
            db,
            trip_id=trip_id,
            expected_status=TripStatus.accepted,
            accepted_cutoff=accepted_cutoff,
        )
        if trip is None:
            _release_lock_without_changes(db)
            continue
        if not _timeout_payment_gate(
            db, trip, action="trip_timeout_accepted_to_cancelled"
        ):
            counts["timeout_payment_cancel_failed"] += 1
            continue
        payment_was_mock_processing = _is_mock_processing_payment(trip.payment)
        ev = _apply_accepted_timeout(db, trip, now=now)
        counts["accepted_to_cancelled"] += 1
        if payment_was_mock_processing:
            counts["mock_payments_failed"] += 1
        emit(ev)

    # 3) ongoing > 6 hours → failed, free driver
    ongoing_ids = (
        db.execute(
            select(Trip.id).where(
                Trip.status == TripStatus.ongoing,
                Trip.started_at.isnot(None),
                Trip.started_at < ongoing_cutoff,
            )
        )
        .scalars()
        .all()
    )
    for trip_id in ongoing_ids:
        trip = _lock_stale_trip(
            db,
            trip_id=trip_id,
            expected_status=TripStatus.ongoing,
            ongoing_cutoff=ongoing_cutoff,
        )
        if trip is None:
            _release_lock_without_changes(db)
            continue
        if not _timeout_payment_gate(
            db, trip, action="trip_timeout_ongoing_to_failed"
        ):
            counts["timeout_payment_cancel_failed"] += 1
            continue
        payment_was_mock_processing = _is_mock_processing_payment(trip.payment)
        ev = _apply_ongoing_timeout(db, trip, now=now)
        counts["ongoing_to_failed"] += 1
        if payment_was_mock_processing:
            counts["mock_payments_failed"] += 1
        emit(ev)

    if any(
        counts[k] > 0
        for k in (
            "assigned_to_requested",
            "accepted_to_cancelled",
            "ongoing_to_failed",
            "timeout_payment_cancel_failed",
        )
    ):
        log_event(
            "trip_timeouts_applied",
            assigned_to_requested=counts["assigned_to_requested"],
            accepted_to_cancelled=counts["accepted_to_cancelled"],
            ongoing_to_failed=counts["ongoing_to_failed"],
            mock_payments_failed=counts["mock_payments_failed"],
            timeout_payment_cancel_failed=counts["timeout_payment_cancel_failed"],
        )

    return counts
