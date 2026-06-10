"""Trip timeouts — automatic state transitions for stuck trips."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.events.dispatcher import emit
from app.models.enums import PaymentStatus, TripStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.services.stripe_service import cancel_payment_intent, retrieve_payment_intent
from app.services.trips import _set_driver_available, on_trip_status_change_for_driving_compliance
from app.utils.logging import log_event

logger = logging.getLogger(__name__)

ASSIGNED_TIMEOUT_MINUTES = 2
ACCEPTED_TIMEOUT_MINUTES = 10
ONGOING_TIMEOUT_HOURS = 6

_CANCELLABLE_STRIPE_STATUSES = frozenset(
    (
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "requires_capture",
    )
)


def _stripe_status(intent: object) -> str:
    status = getattr(intent, "status", None)
    if status is None and isinstance(intent, dict):
        status = intent.get("status")
    return str(status or "")


def _close_timeout_payment(payment: Payment | None, *, trip_id: object) -> bool:
    """Return False when Stripe state is temporarily unsafe to terminalize."""
    if not payment or payment.status in (PaymentStatus.succeeded, PaymentStatus.failed):
        return True

    pi_id = (payment.stripe_payment_intent_id or "").strip()
    if not pi_id or pi_id.startswith("pi_mock_"):
        payment.status = PaymentStatus.failed
        return True

    try:
        pi_status = _stripe_status(retrieve_payment_intent(pi_id))
        if pi_status in _CANCELLABLE_STRIPE_STATUSES:
            cancel_payment_intent(pi_id)
            payment.status = PaymentStatus.failed
            logger.info(
                "trip_timeouts: cancelled Stripe PI for timed-out trip "
                "trip_id=%s payment_intent_id=%s stripe_status=%s",
                trip_id,
                pi_id,
                pi_status,
            )
            return True
        if pi_status in ("canceled", "requires_payment_method"):
            payment.status = PaymentStatus.failed
            return True
        if pi_status == "succeeded":
            payment.status = PaymentStatus.succeeded
            return True
    except Exception as e:
        logger.warning(
            "trip_timeouts: skipping timeout because Stripe cleanup failed "
            "trip_id=%s payment_intent_id=%s error=%s",
            trip_id,
            pi_id,
            e,
        )
        return False

    logger.warning(
        "trip_timeouts: skipping timeout for non-cancellable Stripe status "
        "trip_id=%s payment_intent_id=%s stripe_status=%s",
        trip_id,
        pi_id,
        pi_status,
    )
    return False


def run_trip_timeouts(db: Session) -> dict[str, int]:
    """
    Apply timeout rules to stuck trips. Returns counts of actions taken.
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
    assigned_stuck = (
        db.execute(
            select(Trip)
            .options(joinedload(Trip.payment))
            .where(Trip.status == TripStatus.assigned)
            .where(Trip.updated_at < assigned_cutoff)
        )
        .scalars()
        .all()
    )
    for trip in assigned_stuck:
        trip.status = TripStatus.requested
        counts["assigned_to_requested"] += 1
        logger.info(
            f"trip_timeouts: assigned→requested trip_id={trip.id}, "
            f"updated_at={trip.updated_at}"
        )
        pending_events.append(
            TripStatusChangedEvent(
                trip_id=str(trip.id),
                status=trip.status,
                timestamp=now,
            )
        )

    # 2) accepted > 10 min without start → cancelled, free driver
    accepted_stuck = (
        db.execute(
            select(Trip)
            .options(joinedload(Trip.payment))
            .where(Trip.status == TripStatus.accepted)
            .where(Trip.updated_at < accepted_cutoff)
        )
        .scalars()
        .all()
    )
    for trip in accepted_stuck:
        if not _close_timeout_payment(trip.payment, trip_id=trip.id):
            continue
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
            .options(joinedload(Trip.payment))
            .where(Trip.status == TripStatus.ongoing)
            .where(Trip.started_at.isnot(None))
            .where(Trip.started_at < ongoing_cutoff)
        )
        .scalars()
        .all()
    )
    for trip in ongoing_stuck:
        if not _close_timeout_payment(trip.payment, trip_id=trip.id):
            continue
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
