from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services import trip_timeouts


def _create_user(db: Session, *, role: Role, name_prefix: str) -> User:
    user = User(
        role=role,
        name=f"{name_prefix} {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    return user


def _create_driver(db: Session) -> User:
    user = _create_user(db, role=Role.driver, name_prefix="Timeout Driver")
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=False,
        )
    )
    db.flush()
    return user


def _create_trip_with_payment(
    db: Session,
    *,
    status: TripStatus,
    stale_at: datetime,
    pi_id: str,
) -> tuple[Trip, Payment]:
    passenger = _create_user(db, role=Role.passenger, name_prefix="Timeout Passenger")
    driver = _create_driver(db)
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.id,
        status=status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        distance_km=3.0,
        duration_min=10.0,
        started_at=stale_at if status == TripStatus.ongoing else None,
        updated_at=stale_at,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        total_amount=10.0,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=pi_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(trip)
    db.refresh(payment)
    return trip, payment


def test_accepted_timeout_cancels_stripe_authorization_and_fails_payment(
    db: Session, monkeypatch
) -> None:
    stale_at = datetime.now(timezone.utc) - timedelta(minutes=20)
    pi_id = f"pi_timeout_accept_{uuid.uuid4().hex[:12]}"
    trip, payment = _create_trip_with_payment(
        db,
        status=TripStatus.accepted,
        stale_at=stale_at,
        pi_id=pi_id,
    )
    cancelled: list[str] = []

    monkeypatch.setattr(
        trip_timeouts,
        "retrieve_payment_intent",
        lambda payment_intent_id: SimpleNamespace(status="requires_capture"),
    )
    monkeypatch.setattr(
        trip_timeouts,
        "cancel_payment_intent",
        lambda payment_intent_id: cancelled.append(payment_intent_id),
    )

    counts = trip_timeouts.run_trip_timeouts(db)

    db.refresh(trip)
    db.refresh(payment)
    assert counts["accepted_to_cancelled"] == 1
    assert trip.status == TripStatus.cancelled
    assert payment.status == PaymentStatus.failed
    assert cancelled == [pi_id]


def test_ongoing_timeout_cancels_stripe_authorization_and_fails_payment(
    db: Session, monkeypatch
) -> None:
    stale_at = datetime.now(timezone.utc) - timedelta(hours=7)
    pi_id = f"pi_timeout_ongoing_{uuid.uuid4().hex[:12]}"
    trip, payment = _create_trip_with_payment(
        db,
        status=TripStatus.ongoing,
        stale_at=stale_at,
        pi_id=pi_id,
    )
    cancelled: list[str] = []

    monkeypatch.setattr(
        trip_timeouts,
        "retrieve_payment_intent",
        lambda payment_intent_id: SimpleNamespace(status="requires_capture"),
    )
    monkeypatch.setattr(
        trip_timeouts,
        "cancel_payment_intent",
        lambda payment_intent_id: cancelled.append(payment_intent_id),
    )

    counts = trip_timeouts.run_trip_timeouts(db)

    db.refresh(trip)
    db.refresh(payment)
    assert counts["ongoing_to_failed"] == 1
    assert trip.status == TripStatus.failed
    assert payment.status == PaymentStatus.failed
    assert cancelled == [pi_id]


def test_timeout_skips_terminal_state_when_stripe_cleanup_fails(
    db: Session, monkeypatch
) -> None:
    stale_at = datetime.now(timezone.utc) - timedelta(minutes=20)
    trip, payment = _create_trip_with_payment(
        db,
        status=TripStatus.accepted,
        stale_at=stale_at,
        pi_id=f"pi_timeout_error_{uuid.uuid4().hex[:12]}",
    )

    def raise_stripe_error(payment_intent_id: str) -> object:
        raise RuntimeError(f"stripe unavailable for {payment_intent_id}")

    monkeypatch.setattr(trip_timeouts, "retrieve_payment_intent", raise_stripe_error)

    counts = trip_timeouts.run_trip_timeouts(db)

    db.refresh(trip)
    db.refresh(payment)
    assert counts["accepted_to_cancelled"] == 0
    assert trip.status == TripStatus.accepted
    assert payment.status == PaymentStatus.processing
