"""Mock payment closes to failed on trip cancel (passenger / driver / admin / timeout)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

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
from app.services import trip_timeouts
from app.services import trips as trip_service
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _accepted_trip_with_payment(
    db: Session,
    *,
    pi_id: str,
    payment_status: PaymentStatus = PaymentStatus.processing,
) -> tuple[str, str, str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=False,
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        total_amount=0.50,
        commission_amount=0.08,
        driver_amount=0.42,
        currency="EUR",
        status=payment_status,
        stripe_payment_intent_id=pi_id,
    )
    db.add(payment)
    db.commit()
    return str(passenger.id), str(driver_user.id), str(trip.id), str(payment.id)


def test_passenger_cancel_mock_processing_marks_payment_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    passenger_id, _driver_id, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id
    )
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="changed_plans"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.failed
        assert str(pay.stripe_payment_intent_id).startswith("pi_mock_")
    finally:
        db.close()


def test_driver_cancel_mock_processing_marks_payment_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    _passenger_id, driver_id, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id
    )
    try:
        cancelled = trip_service.cancel_trip_by_driver(
            db=db, driver_id=driver_id, trip_id=trip_id, reason="emergency"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


def test_admin_cancel_mock_processing_marks_payment_failed_no_stripe(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    retrieve = MagicMock(side_effect=AssertionError("Stripe must not be called for mock"))
    cancel_pi = MagicMock(side_effect=AssertionError("Stripe must not be called for mock"))
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    _p, _d, trip_id, payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    try:
        cancelled = trip_service.cancel_trip_by_admin(
            db=db, trip_id=trip_id, cancellation_reason="ops cleanup"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.failed
        retrieve.assert_not_called()
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_passenger_cancel_real_pi_keeps_processing_and_cancels_stripe(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    passenger_id, _d, trip_id, payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    retrieve = MagicMock(
        return_value=SimpleNamespace(status="requires_capture", id=pi_id)
    )
    cancel_pi = MagicMock(return_value=SimpleNamespace(status="canceled", id=pi_id))
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="abort"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
        retrieve.assert_called_once_with(pi_id)
        cancel_pi.assert_called_once_with(pi_id)
    finally:
        db.close()


def test_passenger_cancel_stripe_cancel_failure_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """L-PAY-03: Stripe cancel failure must not mark trip cancelled."""
    from fastapi import HTTPException

    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    passenger_id, driver_id, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id
    )
    emit = MagicMock()
    log_ev = MagicMock()
    monkeypatch.setattr(trip_service, "emit", emit)
    monkeypatch.setattr(trip_service, "log_event", log_ev)
    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        MagicMock(return_value=SimpleNamespace(status="requires_capture", id=pi_id)),
    )
    monkeypatch.setattr(
        trip_service,
        "cancel_payment_intent",
        MagicMock(side_effect=RuntimeError("stripe_timeout")),
    )
    try:
        with pytest.raises(HTTPException) as ei:
            trip_service.cancel_trip_by_passenger(
                db=db, passenger_id=passenger_id, trip_id=trip_id, reason="abort"
            )
        assert ei.value.status_code == 502
        assert ei.value.detail == "Payment cancellation failed."
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        drv = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one()
        assert trip.status == TripStatus.accepted
        assert pay.status == PaymentStatus.processing
        assert drv.is_available is False
        emit.assert_not_called()
        assert not any(
            c.args and c.args[0] == "trip_state_change" for c in log_ev.call_args_list
        )
    finally:
        db.close()


def test_driver_cancel_stripe_cancel_failure_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi import HTTPException

    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    _p, driver_id, trip_id, _payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        MagicMock(return_value=SimpleNamespace(status="requires_capture", id=pi_id)),
    )
    monkeypatch.setattr(
        trip_service,
        "cancel_payment_intent",
        MagicMock(side_effect=RuntimeError("stripe_down")),
    )
    try:
        before = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one()
        count_before = before.cancellation_count or 0
        with pytest.raises(HTTPException) as ei:
            trip_service.cancel_trip_by_driver(
                db=db, driver_id=driver_id, trip_id=trip_id, reason="emergency"
            )
        assert ei.value.status_code == 502
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        drv = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one()
        assert trip.status == TripStatus.accepted
        assert (drv.cancellation_count or 0) == count_before
        assert drv.is_available is False
    finally:
        db.close()


def test_admin_cancel_requires_capture_and_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi import HTTPException

    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    _p, _d, trip_id, payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    retrieve = MagicMock(
        return_value=SimpleNamespace(status="requires_capture", id=pi_id)
    )
    cancel_pi = MagicMock(return_value=SimpleNamespace(status="canceled", id=pi_id))
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    try:
        cancelled = trip_service.cancel_trip_by_admin(
            db=db, trip_id=trip_id, cancellation_reason="ops"
        )
        assert cancelled.status == TripStatus.cancelled
        cancel_pi.assert_called_once_with(pi_id)
    finally:
        db.close()

    db2 = _db()
    pi_id2 = f"pi_real_{uuid.uuid4().hex[:24]}"
    _p2, _d2, trip_id2, _pay2 = _accepted_trip_with_payment(db2, pi_id=pi_id2)
    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        MagicMock(return_value=SimpleNamespace(status="requires_capture", id=pi_id2)),
    )
    monkeypatch.setattr(
        trip_service,
        "cancel_payment_intent",
        MagicMock(side_effect=RuntimeError("boom")),
    )
    try:
        with pytest.raises(HTTPException) as ei:
            trip_service.cancel_trip_by_admin(db=db2, trip_id=trip_id2)
        assert ei.value.status_code == 502
        trip = db2.execute(select(Trip).where(Trip.id == trip_id2)).scalar_one()
        assert trip.status == TripStatus.accepted
    finally:
        db2.close()


def test_passenger_cancel_terminal_canceled_pi_allows_local_cancel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    passenger_id, _d, trip_id, payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    retrieve = MagicMock(return_value=SimpleNamespace(status="canceled", id=pi_id))
    cancel_pi = MagicMock(side_effect=AssertionError("must not cancel terminal PI"))
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="already_canceled"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_passenger_cancel_terminal_succeeded_pi_allows_local_cancel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    passenger_id, _d, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id, payment_status=PaymentStatus.succeeded
    )
    retrieve = MagicMock(return_value=SimpleNamespace(status="succeeded", id=pi_id))
    cancel_pi = MagicMock(side_effect=AssertionError("must not cancel succeeded PI"))
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="late"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_passenger_cancel_does_not_alter_succeeded_mock_payment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    passenger_id, _d, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id, payment_status=PaymentStatus.succeeded
    )
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="late"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_passenger_cancel_idempotent_when_payment_already_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    passenger_id, _d, trip_id, payment_id = _accepted_trip_with_payment(
        db, pi_id=pi_id, payment_status=PaymentStatus.failed
    )
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=passenger_id, trip_id=trip_id, reason="again"
        )
        assert cancelled.status == TripStatus.cancelled
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


def test_passenger_cancel_without_payment_still_works(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=str(passenger.id), trip_id=str(trip.id), reason="no_pay"
        )
        assert cancelled.status == TripStatus.cancelled
        assert cancelled.payment is None
    finally:
        db.close()


def test_accepted_timeout_cancels_and_fails_mock_payment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    _p, _d, trip_id, payment_id = _accepted_trip_with_payment(db, pi_id=pi_id)
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    trip.updated_at = datetime.now(timezone.utc) - timedelta(minutes=15)
    db.commit()
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        assert counts["accepted_to_cancelled"] >= 1
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert trip.status == TripStatus.cancelled
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


def test_complete_mock_still_marks_succeeded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Regression: cancel fix must not change complete_trip mock → succeeded."""
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=False,
        )
    )
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
        stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
    )
    db.add(payment)
    db.commit()
    payment_id = str(payment.id)
    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=str(driver_user.id), trip_id=str(trip.id)
        )
        assert completed.status == TripStatus.completed
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()
