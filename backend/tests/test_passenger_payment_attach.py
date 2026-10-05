"""Passenger attach PaymentMethod + complete requires PM (staging Stripe readiness)."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException
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
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _trip_with_payment(db: Session, *, pi_id: str | None = None) -> tuple[Trip, User]:
    if pi_id is None:
        pi_id = f"pi_test_{uuid.uuid4().hex}"
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
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=driver_user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=15.0,
        is_available=False,
    )
    db.add(driver)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.72,
        destination_lng=-9.14,
        estimated_price=12.0,
        distance_km=3.0,
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        stripe_payment_intent_id=pi_id,
        total_amount=0.5,
        currency="EUR",
        status=PaymentStatus.processing,
        commission_amount=0.0,
        driver_amount=0.0,
        driver_payout=0.0,
    )
    db.add(payment)
    db.commit()
    db.refresh(trip)
    return trip, passenger


def test_attach_rejects_mock_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        trip, passenger = _trip_with_payment(db, pi_id=f"pi_mock_{uuid.uuid4().hex}")
        with pytest.raises(HTTPException) as ei:
            trip_service.attach_payment_method_for_passenger_trip(
                db=db,
                passenger_id=str(passenger.id),
                trip_id=str(trip.id),
                payment_method_id="pm_card_visa",
            )
        assert ei.value.status_code == 409
        assert ei.value.detail == "stripe_mock_no_attach"
    finally:
        db.close()


def test_attach_rejects_invalid_pm_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        trip, passenger = _trip_with_payment(db)
        with pytest.raises(HTTPException) as ei:
            trip_service.attach_payment_method_for_passenger_trip(
                db=db,
                passenger_id=str(passenger.id),
                trip_id=str(trip.id),
                payment_method_id="not_a_pm",
            )
        assert ei.value.status_code == 400
        assert ei.value.detail == "invalid_payment_method"
    finally:
        db.close()


def test_attach_calls_stripe_modify(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        trip, passenger = _trip_with_payment(db)
        fake_pi = SimpleNamespace(status="requires_confirmation", payment_method=None)
        with (
            patch(
                "app.services.trips.retrieve_payment_intent",
                return_value=fake_pi,
            ) as retrieve,
            patch(
                "app.services.trips.attach_payment_method_to_intent",
                return_value=fake_pi,
            ) as attach,
        ):
            out = trip_service.attach_payment_method_for_passenger_trip(
                db=db,
                passenger_id=str(passenger.id),
                trip_id=str(trip.id),
                payment_method_id="pm_card_visa",
            )
        assert str(out.id) == str(trip.id)
        retrieve.assert_called_once()
        attach.assert_called_once()
        assert attach.call_args[0][0] == trip.payment.stripe_payment_intent_id
        assert attach.call_args[0][1] == "pm_card_visa"
    finally:
        db.close()


def test_complete_blocks_without_payment_method(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    db = _db()
    try:
        trip, _passenger = _trip_with_payment(db)
        trip.status = TripStatus.ongoing
        db.commit()

        intent_no_pm = SimpleNamespace(
            status="requires_confirmation",
            payment_method=None,
            amount=50,
            currency="eur",
        )
        intent_after_update = SimpleNamespace(
            status="requires_confirmation",
            payment_method=None,
            amount=1200,
            currency="eur",
        )

        with (
            patch(
                "app.services.trips.retrieve_payment_intent",
                side_effect=lambda pi_id: intent_no_pm,
            ),
            patch(
                "app.services.trips.update_payment_intent_amount",
                return_value=intent_after_update,
            ),
            patch("app.services.trips.confirm_payment_intent") as confirm,
            patch("app.services.trips.capture_payment_intent") as capture,
        ):
            with pytest.raises(HTTPException) as ei:
                trip_service.complete_trip(
                    db=db,
                    driver_id=str(trip.driver_id),
                    trip_id=str(trip.id),
                )
        assert ei.value.status_code == 409
        assert ei.value.detail == "payment_method_required"
        confirm.assert_not_called()
        capture.assert_not_called()
        db.refresh(trip)
        assert trip.status == TripStatus.ongoing
    finally:
        db.close()


def test_complete_requires_action_returns_409(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    db = _db()
    try:
        trip, _passenger = _trip_with_payment(db)
        trip.status = TripStatus.ongoing
        db.commit()

        intent_pm = SimpleNamespace(
            status="requires_confirmation",
            payment_method="pm_card_threeDSecure2Required",
            amount=50,
            currency="eur",
            client_secret="cs_test",
        )
        confirmed = SimpleNamespace(
            status="requires_action",
            payment_method="pm_card_threeDSecure2Required",
            amount=1200,
            currency="eur",
            client_secret="cs_test",
        )

        with (
            patch(
                "app.services.trips.retrieve_payment_intent",
                return_value=intent_pm,
            ),
            patch(
                "app.services.trips.update_payment_intent_amount",
                return_value=intent_pm,
            ),
            patch(
                "app.services.trips.confirm_payment_intent",
                return_value=confirmed,
            ),
            patch("app.services.trips.capture_payment_intent") as capture,
        ):
            with pytest.raises(HTTPException) as ei:
                trip_service.complete_trip(
                    db=db,
                    driver_id=str(trip.driver_id),
                    trip_id=str(trip.id),
                )
        assert ei.value.status_code == 409
        assert ei.value.detail == "payment_requires_action"
        capture.assert_not_called()
    finally:
        db.close()
