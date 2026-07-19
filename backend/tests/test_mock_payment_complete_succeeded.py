"""PAYMENTS-STUCK-1A: complete_trip settles mock payments; real Stripe stays processing."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services import trips as trip_service
from app.services.system_health import get_system_health


def _make_db() -> Session:
    return SessionLocal()


def _create_ongoing_trip(
    db: Session, *, pi_id: str
) -> tuple[str, str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()

    driver_user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()

    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=driver_user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=False,
    )
    db.add(driver)
    db.flush()

    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.ongoing,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        distance_km=3.0,
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()

    payment = Payment(
        trip_id=trip.id,
        total_amount=0.50,
        commission_amount=0.08,
        driver_amount=0.42,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=pi_id,
    )
    db.add(payment)
    db.commit()
    return str(driver_user.id), str(trip.id), str(payment.id)


def test_complete_trip_mock_marks_payment_succeeded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _make_db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _create_ongoing_trip(db, pi_id=pi_id)
    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        assert completed.final_price is not None

        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
        assert str(pay.stripe_payment_intent_id).startswith("pi_mock_")
        assert round(float(pay.total_amount), 2) == round(float(completed.final_price), 2)
        assert pay.commission_amount is not None
        assert pay.driver_payout is not None
    finally:
        db.close()


def test_complete_trip_pi_mock_prefix_settles_even_if_stripe_mock_false(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Defesa: PI mock nunca deve ir a Stripe; complete deve settled."""
    db = _make_db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _create_ongoing_trip(db, pi_id=pi_id)
    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_complete_trip_real_pi_leaves_payment_processing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _make_db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)

    pi_id = f"pi_test_real_{uuid.uuid4().hex[:20]}"
    driver_id, trip_id, payment_id = _create_ongoing_trip(db, pi_id=pi_id)

    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        lambda _pi_id: SimpleNamespace(status="requires_confirmation"),
    )
    monkeypatch.setattr(
        trip_service,
        "update_payment_intent_amount",
        lambda _pi_id, *, amount_cents, idempotency_key: None,
    )
    monkeypatch.setattr(
        trip_service,
        "confirm_payment_intent",
        lambda _pi_id, **_kwargs: None,
    )
    monkeypatch.setattr(
        trip_service,
        "capture_payment_intent",
        lambda _pi_id, *, idempotency_key: None,
    )

    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
        assert round(float(pay.total_amount), 2) == round(float(completed.final_price), 2)
    finally:
        db.close()


def test_mock_completed_payment_not_in_stuck_health(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _make_db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _create_ongoing_trip(db, pi_id=pi_id)
    try:
        trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
        # Age the row past the 10m stuck threshold; succeeded must not count as stuck.
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        pay.updated_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        db.commit()

        health = get_system_health(db)
        stuck_ids = {row.get("id") for row in (health.get("stuck_payments") or [])}
        assert payment_id not in stuck_ids
        inconsistent = health.get("inconsistent_financial_state") or []
        bad = [
            row
            for row in inconsistent
            if row.get("id") == payment_id
            or row.get("trip_id") == trip_id
            or row.get("payment_id") == payment_id
        ]
        assert bad == []
    finally:
        db.close()
