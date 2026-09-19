"""Timeout fail-closed: cancel real Stripe PI before accepted/ongoing timeout."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from sqlalchemy import select, update
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

_STALE = datetime.now(timezone.utc) - timedelta(days=365 * 20)


def _db() -> Session:
    return SessionLocal()


def _isolate_timeout_cutoffs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only ultra-stale seeded trips match; ignore leftover DB rows."""
    ten_years_in_minutes = 10 * 365 * 24 * 60
    monkeypatch.setattr(
        trip_timeouts, "ASSIGNED_TIMEOUT_MINUTES", ten_years_in_minutes
    )
    monkeypatch.setattr(
        trip_timeouts, "ACCEPTED_TIMEOUT_MINUTES", ten_years_in_minutes
    )
    monkeypatch.setattr(trip_timeouts, "ONGOING_TIMEOUT_HOURS", 10 * 365 * 24)


def _neutralize_stale_timeout_candidates(db: Session) -> None:
    """Refresh timestamps so prior test leftovers miss the isolated cutoffs."""
    now = datetime.now(timezone.utc)
    db.execute(
        update(Trip)
        .where(Trip.status == TripStatus.accepted)
        .values(updated_at=now)
        .execution_options(synchronize_session=False)
    )
    db.execute(
        update(Trip)
        .where(Trip.status == TripStatus.ongoing)
        .values(started_at=now, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    db.execute(
        update(Trip)
        .where(Trip.status == TripStatus.assigned)
        .values(updated_at=now)
        .execution_options(synchronize_session=False)
    )
    db.commit()


def _seed_accepted(
    db: Session,
    *,
    pi_id: str | None,
    payment_status: PaymentStatus = PaymentStatus.processing,
) -> tuple[str, str, str | None]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, driver_user])
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
        updated_at=_STALE,
    )
    db.add(trip)
    db.flush()
    payment_id = None
    if pi_id is not None:
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
        db.flush()
        payment_id = str(payment.id)
    db.commit()
    return str(driver_user.id), str(trip.id), payment_id


def _seed_ongoing(
    db: Session,
    *,
    pi_id: str | None,
    payment_status: PaymentStatus = PaymentStatus.processing,
) -> tuple[str, str, str | None]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, driver_user])
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
        started_at=_STALE,
        updated_at=_STALE,
    )
    db.add(trip)
    db.flush()
    payment_id = None
    if pi_id is not None:
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
        db.flush()
        payment_id = str(payment.id)
    db.commit()
    return str(driver_user.id), str(trip.id), payment_id


def _patch_stripe(
    monkeypatch: pytest.MonkeyPatch,
    *,
    retrieve_status: str = "requires_capture",
    cancel_error: Exception | None = None,
    retrieve_error: Exception | None = None,
) -> tuple[MagicMock, MagicMock]:
    retrieve = MagicMock()
    if retrieve_error is not None:
        retrieve.side_effect = retrieve_error
    else:
        retrieve.return_value = SimpleNamespace(status=retrieve_status, id="pi")
    cancel_pi = MagicMock()
    if cancel_error is not None:
        cancel_pi.side_effect = cancel_error
    else:
        cancel_pi.return_value = SimpleNamespace(status="canceled", id="pi")
    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    return retrieve, cancel_pi


def test_accepted_real_pi_cancel_success_times_out(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _seed_accepted(db, pi_id=pi_id)
    retrieve, cancel_pi = _patch_stripe(monkeypatch)
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert counts["accepted_to_cancelled"] == 1
        assert counts["timeout_payment_cancel_failed"] == 0
        assert trip.status == TripStatus.cancelled
        assert driver.is_available is True
        assert pay.status == PaymentStatus.processing
        retrieve.assert_called_once_with(pi_id)
        cancel_pi.assert_called_once_with(pi_id)
    finally:
        db.close()


def test_accepted_real_pi_cancel_fail_remains_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _seed_accepted(db, pi_id=pi_id)
    _patch_stripe(monkeypatch, cancel_error=RuntimeError("stripe down"))
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert counts["accepted_to_cancelled"] == 0
        assert counts["timeout_payment_cancel_failed"] == 1
        assert trip.status == TripStatus.accepted
        assert driver.is_available is False
        assert pay.status == PaymentStatus.processing
        assert pay.stripe_payment_intent_id == pi_id
    finally:
        _neutralize_stale_timeout_candidates(db)
        db.close()


def test_ongoing_real_pi_cancel_success_times_out(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _seed_ongoing(db, pi_id=pi_id)
    retrieve, cancel_pi = _patch_stripe(monkeypatch)
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert counts["ongoing_to_failed"] == 1
        assert counts["timeout_payment_cancel_failed"] == 0
        assert trip.status == TripStatus.failed
        assert driver.is_available is True
        assert pay.status == PaymentStatus.processing
        retrieve.assert_called_once_with(pi_id)
        cancel_pi.assert_called_once_with(pi_id)
    finally:
        db.close()


def test_ongoing_real_pi_cancel_fail_remains_ongoing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _seed_ongoing(db, pi_id=pi_id)
    _patch_stripe(monkeypatch, cancel_error=RuntimeError("stripe down"))
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert counts["ongoing_to_failed"] == 0
        assert counts["timeout_payment_cancel_failed"] == 1
        assert trip.status == TripStatus.ongoing
        assert driver.is_available is False
        assert pay.status == PaymentStatus.processing
    finally:
        _neutralize_stale_timeout_candidates(db)
        db.close()


def test_terminal_pi_allows_timeout_without_cancel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, _payment_id = _seed_accepted(db, pi_id=pi_id)
    retrieve, cancel_pi = _patch_stripe(monkeypatch, retrieve_status="canceled")
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        assert counts["accepted_to_cancelled"] == 1
        assert trip.status == TripStatus.cancelled
        assert driver.is_available is True
        retrieve.assert_called_once_with(pi_id)
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_mock_pi_timeout_unchanged(monkeypatch: pytest.MonkeyPatch) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _seed_accepted(db, pi_id=pi_id)
    retrieve, cancel_pi = _patch_stripe(monkeypatch)
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        assert counts["accepted_to_cancelled"] == 1
        assert counts["mock_payments_failed"] == 1
        assert trip.status == TripStatus.cancelled
        assert pay.status == PaymentStatus.failed
        assert driver.is_available is True
        retrieve.assert_not_called()
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_no_payment_timeout_unchanged(monkeypatch: pytest.MonkeyPatch) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id, _ = _seed_accepted(db, pi_id=None)
    retrieve, cancel_pi = _patch_stripe(monkeypatch)
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        assert counts["accepted_to_cancelled"] == 1
        assert trip.status == TripStatus.cancelled
        assert driver.is_available is True
        retrieve.assert_not_called()
        cancel_pi.assert_not_called()
    finally:
        db.close()


def test_batch_continues_after_stripe_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Trip A Stripe fail must not block trip B timeout."""
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_a = f"pi_real_{uuid.uuid4().hex[:24]}"
    pi_b = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_a, trip_a, _ = _seed_accepted(db, pi_id=pi_a)
    driver_b, trip_b, _ = _seed_accepted(db, pi_id=pi_b)

    def retrieve(pi_id: str):
        return SimpleNamespace(status="requires_capture", id=pi_id)

    def cancel_pi(pi_id: str):
        if pi_id == pi_a:
            raise RuntimeError("stripe fail A")
        return SimpleNamespace(status="canceled", id=pi_id)

    monkeypatch.setattr(trip_service, "retrieve_payment_intent", retrieve)
    monkeypatch.setattr(trip_service, "cancel_payment_intent", cancel_pi)
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip_a_row = db.execute(select(Trip).where(Trip.id == trip_a)).scalar_one()
        trip_b_row = db.execute(select(Trip).where(Trip.id == trip_b)).scalar_one()
        drv_a = db.execute(
            select(Driver).where(Driver.user_id == driver_a)
        ).scalar_one()
        drv_b = db.execute(
            select(Driver).where(Driver.user_id == driver_b)
        ).scalar_one()
        assert counts["timeout_payment_cancel_failed"] == 1
        assert counts["accepted_to_cancelled"] == 1
        assert trip_a_row.status == TripStatus.accepted
        assert trip_b_row.status == TripStatus.cancelled
        assert drv_a.is_available is False
        assert drv_b.is_available is True
    finally:
        _neutralize_stale_timeout_candidates(db)
        db.close()


def test_retrieve_failure_fail_closed_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    db = _db()
    _neutralize_stale_timeout_candidates(db)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    pi_id = f"pi_real_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, _ = _seed_accepted(db, pi_id=pi_id)
    _patch_stripe(monkeypatch, retrieve_error=RuntimeError("network"))
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        driver = db.execute(
            select(Driver).where(Driver.user_id == driver_id)
        ).scalar_one()
        assert counts["accepted_to_cancelled"] == 0
        assert counts["timeout_payment_cancel_failed"] == 1
        assert trip.status == TripStatus.accepted
        assert driver.is_available is False
    finally:
        _neutralize_stale_timeout_candidates(db)
        db.close()
