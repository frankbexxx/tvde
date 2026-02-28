"""
System health checks — detection of stuck states and inconsistent records.
Read-only, no side effects. Does not alter any financial flow.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

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

STUCK_PAYMENT_THRESHOLD_HOURS = 2
STUCK_TRIP_THRESHOLD_HOURS = 4


def _to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def get_system_health(db: Session) -> dict[str, list[dict[str, Any]]]:
    """
    Detect stuck states and inconsistencies. Read-only.
    Returns dict with keys matching SystemHealthResponse schema.
    """
    now = datetime.now(timezone.utc)
    stuck_payment_cutoff = now - timedelta(hours=STUCK_PAYMENT_THRESHOLD_HOURS)
    stuck_trip_cutoff = now - timedelta(hours=STUCK_TRIP_THRESHOLD_HOURS)

    stuck_payments: list[dict[str, Any]] = []
    stuck_trips: list[dict[str, Any]] = []
    inconsistent_financial_state: list[dict[str, Any]] = []
    orphan_payments: list[dict[str, Any]] = []
    missing_payment_records: list[dict[str, Any]] = []

    # 1) Payments in status=processing for more than 2 hours
    payments_processing = db.execute(
        select(Payment)
        .where(Payment.status == PaymentStatus.processing)
        .where(Payment.created_at < stuck_payment_cutoff)
    ).scalars().all()
    for p in payments_processing:
        stuck_payments.append({
            "id": str(p.id),
            "trip_id": str(p.trip_id),
            "status": p.status.value,
            "created_at": _to_iso(p.created_at),
            "updated_at": _to_iso(p.updated_at),
        })

    # 2) Trips in status=ongoing for more than 4 hours
    trips_ongoing = db.execute(
        select(Trip)
        .where(Trip.status == TripStatus.ongoing)
        .where(Trip.started_at.isnot(None))
        .where(Trip.started_at < stuck_trip_cutoff)
    ).scalars().all()
    for t in trips_ongoing:
        payment = t.payment
        stuck_trips.append({
            "id": str(t.id),
            "payment_id": str(payment.id) if payment else None,
            "status": t.status.value,
            "started_at": _to_iso(t.started_at),
            "updated_at": _to_iso(t.updated_at),
        })

    # 3) Payments with status=succeeded where trip.status != completed
    # 4) Trips completed where payment.status != succeeded
    payments_with_trip = db.execute(
        select(Payment, Trip)
        .join(Trip, Payment.trip_id == Trip.id)
    ).all()
    for payment, trip in payments_with_trip:
        if payment.status == PaymentStatus.succeeded and trip.status != TripStatus.completed:
            inconsistent_financial_state.append({
                "id": str(payment.id),
                "trip_id": str(trip.id),
                "payment_id": str(payment.id),
                "payment_status": payment.status.value,
                "trip_status": trip.status.value,
                "issue": "payment_succeeded_but_trip_not_completed",
                "payment_updated_at": _to_iso(payment.updated_at),
                "trip_updated_at": _to_iso(trip.updated_at),
            })
        elif trip.status == TripStatus.completed and payment.status != PaymentStatus.succeeded:
            inconsistent_financial_state.append({
                "id": str(trip.id),
                "trip_id": str(trip.id),
                "payment_id": str(payment.id),
                "payment_status": payment.status.value,
                "trip_status": trip.status.value,
                "issue": "trip_completed_but_payment_not_succeeded",
                "trip_completed_at": _to_iso(trip.completed_at),
                "payment_updated_at": _to_iso(payment.updated_at),
            })

    # 5) Payments without stripe_payment_intent_id
    payments_no_pi = db.execute(
        select(Payment).where(Payment.stripe_payment_intent_id.is_(None))
    ).scalars().all()
    for p in payments_no_pi:
        orphan_payments.append({
            "id": str(p.id),
            "trip_id": str(p.trip_id),
            "status": p.status.value,
            "created_at": _to_iso(p.created_at),
        })

    # 6) Trips with status >= accepted but no Payment record
    trips_no_payment = db.execute(
        select(Trip)
        .where(Trip.status.in_(TRIP_STATUSES_REQUIRING_PAYMENT))
        .where(~exists().where(Payment.trip_id == Trip.id))
    ).scalars().all()
    for t in trips_no_payment:
        missing_payment_records.append({
            "id": str(t.id),
            "trip_id": str(t.id),
            "status": t.status.value,
            "driver_id": str(t.driver_id) if t.driver_id else None,
            "created_at": _to_iso(t.created_at),
            "updated_at": _to_iso(t.updated_at),
        })

    return {
        "stuck_payments": stuck_payments,
        "stuck_trips": stuck_trips,
        "inconsistent_financial_state": inconsistent_financial_state,
        "orphan_payments": orphan_payments,
        "missing_payment_records": missing_payment_records,
    }
