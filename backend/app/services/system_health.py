"""
System health checks — detection of stuck states and inconsistent records.
Read-only, no side effects. Does not alter any financial flow.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.models.enums import PaymentStatus, TripStatus


# Statuses where a trip must have an associated Payment (created at accept_trip)
TRIP_STATUSES_REQUIRING_PAYMENT = (
    TripStatus.accepted,
    TripStatus.arriving,
    TripStatus.ongoing,
    TripStatus.completed,
)

# Thresholds for beta monitoring
STUCK_PAYMENT_THRESHOLD_MINUTES = 10
TRIP_ACCEPTED_TOO_LONG_MINUTES = 30
TRIP_ONGOING_TOO_LONG_HOURS = 6
DRIVER_UNAVAILABLE_TOO_LONG_MINUTES = 10


def _to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def get_system_health(db: Session) -> dict[str, Any]:
    """
    Detect stuck states and inconsistencies. Read-only.
    Returns dict with keys matching SystemHealthResponse schema.
    """
    now = datetime.now(timezone.utc)
    stuck_payment_cutoff = now - timedelta(minutes=STUCK_PAYMENT_THRESHOLD_MINUTES)
    trip_accepted_cutoff = now - timedelta(minutes=TRIP_ACCEPTED_TOO_LONG_MINUTES)
    trip_ongoing_cutoff = now - timedelta(hours=TRIP_ONGOING_TOO_LONG_HOURS)
    driver_unavailable_cutoff = now - timedelta(
        minutes=DRIVER_UNAVAILABLE_TOO_LONG_MINUTES
    )

    stuck_payments: list[dict[str, Any]] = []
    trips_accepted_too_long: list[dict[str, Any]] = []
    trips_ongoing_too_long: list[dict[str, Any]] = []
    drivers_unavailable_too_long: list[dict[str, Any]] = []
    inconsistent_financial_state: list[dict[str, Any]] = []
    missing_payment_records: list[dict[str, Any]] = []
    warnings: list[str] = []

    # 1) Payments in status=processing for more than 10 min
    payments_processing = (
        db.execute(
            select(Payment)
            .where(Payment.status == PaymentStatus.processing)
            .where(Payment.updated_at < stuck_payment_cutoff)
        )
        .scalars()
        .all()
    )
    for p in payments_processing:
        stuck_payments.append(
            {
                "id": str(p.id),
                "trip_id": str(p.trip_id),
                "status": p.status.value,
                "created_at": _to_iso(p.created_at),
                "updated_at": _to_iso(p.updated_at),
                "stripe_payment_intent_id": p.stripe_payment_intent_id,
            }
        )

    # 2) Trips in status=accepted for more than 30 min
    trips_accepted = (
        db.execute(
            select(Trip)
            .where(Trip.status == TripStatus.accepted)
            .where(Trip.updated_at < trip_accepted_cutoff)
        )
        .scalars()
        .all()
    )
    for t in trips_accepted:
        payment = t.payment
        trips_accepted_too_long.append(
            {
                "id": str(t.id),
                "payment_id": str(payment.id) if payment else None,
                "status": t.status.value,
                "updated_at": _to_iso(t.updated_at),
            }
        )

    # 3) Trips in status=ongoing for more than 6 hours
    trips_ongoing = (
        db.execute(
            select(Trip)
            .where(Trip.status == TripStatus.ongoing)
            .where(Trip.started_at.isnot(None))
            .where(Trip.started_at < trip_ongoing_cutoff)
        )
        .scalars()
        .all()
    )
    for t in trips_ongoing:
        payment = t.payment
        trips_ongoing_too_long.append(
            {
                "id": str(t.id),
                "payment_id": str(payment.id) if payment else None,
                "status": t.status.value,
                "started_at": _to_iso(t.started_at),
                "updated_at": _to_iso(t.updated_at),
            }
        )

    # 4) Drivers is_available=False without active trip for > 10 min
    active_trip_statuses = (
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    )
    drivers_busy = (
        db.execute(
            select(Driver).where(
                Driver.is_available.is_(False),
                Driver.updated_at < driver_unavailable_cutoff,
            )
        )
        .scalars()
        .all()
    )
    for d in drivers_busy:
        has_active_trip = (
            db.execute(
                select(Trip).where(
                    Trip.driver_id == d.user_id,
                    Trip.status.in_(active_trip_statuses),
                )
            ).first()
            is not None
        )
        if not has_active_trip:
            drivers_unavailable_too_long.append(
                {
                    "driver_id": str(d.user_id),
                    "is_available": d.is_available,
                    "updated_at": _to_iso(d.updated_at),
                }
            )

    # 5) Payments with status=succeeded where trip.status != completed
    # 6) Trips completed where payment.status != succeeded
    payments_with_trip = db.execute(
        select(Payment, Trip).join(Trip, Payment.trip_id == Trip.id)
    ).all()
    for payment, trip in payments_with_trip:
        if (
            payment.status == PaymentStatus.succeeded
            and trip.status != TripStatus.completed
        ):
            inconsistent_financial_state.append(
                {
                    "id": str(payment.id),
                    "trip_id": str(trip.id),
                    "payment_status": payment.status.value,
                    "trip_status": trip.status.value,
                    "issue": "payment_succeeded_but_trip_not_completed",
                    "payment_updated_at": _to_iso(payment.updated_at),
                    "trip_updated_at": _to_iso(trip.updated_at),
                }
            )
        elif (
            trip.status == TripStatus.completed
            and payment.status != PaymentStatus.succeeded
        ):
            inconsistent_financial_state.append(
                {
                    "id": str(trip.id),
                    "trip_id": str(trip.id),
                    "payment_status": payment.status.value,
                    "trip_status": trip.status.value,
                    "issue": "trip_completed_but_payment_not_succeeded",
                    "trip_completed_at": _to_iso(trip.completed_at),
                    "payment_updated_at": _to_iso(payment.updated_at),
                }
            )

    # 7) Trips with status >= accepted but no Payment record
    trips_no_payment = (
        db.execute(
            select(Trip)
            .where(Trip.status.in_(TRIP_STATUSES_REQUIRING_PAYMENT))
            .where(~exists().where(Payment.trip_id == Trip.id))
        )
        .scalars()
        .all()
    )
    for t in trips_no_payment:
        missing_payment_records.append(
            {
                "id": str(t.id),
                "trip_id": str(t.id),
                "status": t.status.value,
                "driver_id": str(t.driver_id) if t.driver_id else None,
                "created_at": _to_iso(t.created_at),
                "updated_at": _to_iso(t.updated_at),
            }
        )

    # Build warnings
    if stuck_payments:
        warnings.append(f"{len(stuck_payments)} payment(s) stuck in processing")
    if trips_accepted_too_long:
        warnings.append(f"{len(trips_accepted_too_long)} trip(s) accepted too long")
    if trips_ongoing_too_long:
        warnings.append(f"{len(trips_ongoing_too_long)} trip(s) ongoing too long")
    if drivers_unavailable_too_long:
        warnings.append(
            f"{len(drivers_unavailable_too_long)} driver(s) unavailable without trip"
        )
    if inconsistent_financial_state:
        warnings.append(
            f"{len(inconsistent_financial_state)} inconsistent financial state(s)"
        )
    if missing_payment_records:
        warnings.append(f"{len(missing_payment_records)} trip(s) missing payment")

    all_ok = not any(
        [
            stuck_payments,
            trips_accepted_too_long,
            trips_ongoing_too_long,
            drivers_unavailable_too_long,
            inconsistent_financial_state,
            missing_payment_records,
        ]
    )
    status = "ok" if all_ok else "degraded"

    return {
        "status": status,
        "stuck_trips": [],  # deprecated, kept for compatibility
        "trips_accepted_too_long": trips_accepted_too_long,
        "trips_ongoing_too_long": trips_ongoing_too_long,
        "stuck_payments": stuck_payments,
        "drivers_unavailable_too_long": drivers_unavailable_too_long,
        "missing_payment_records": missing_payment_records,
        "inconsistent_financial_state": inconsistent_financial_state,
        "orphan_payments": [],  # deprecated, kept for compatibility
        "warnings": warnings,
    }
