"""Payment hardening: placeholder €0.50, amount guards, confirm-on-accept live block."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services import trips as trip_service
from app.services.admin_payment_reconciliation import (
    reconcile_single_trip_payment_with_stripe,
)
from app.services.payment_amount_guards import (
    final_price_cents,
    validate_stripe_amount_matches_expected,
)


def _db() -> Session:
    return SessionLocal()


def _create_ongoing(
    db: Session, *, pi_id: str, payment_total: float = 0.50
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
        total_amount=payment_total,
        commission_amount=0.08,
        driver_amount=0.42,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=pi_id,
    )
    db.add(payment)
    db.commit()
    return str(driver_user.id), str(trip.id), str(payment.id)


def test_guard_helper_placeholder_mismatch() -> None:
    r = validate_stripe_amount_matches_expected(
        stripe_object={"amount": 50, "currency": "eur"},
        expected_cents=1200,
        expected_currency="eur",
    )
    assert not r.ok
    assert r.reason == "placeholder_amount_mismatch"


def test_guard_helper_currency_mismatch() -> None:
    r = validate_stripe_amount_matches_expected(
        stripe_object={"amount": 1200, "currency": "usd"},
        expected_cents=1200,
        expected_currency="eur",
    )
    assert not r.ok
    assert r.reason == "currency_mismatch"


def test_confirm_on_accept_blocked_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_CONFIRM_ON_ACCEPT", True, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENV", "prod", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    assert settings.confirm_on_accept_forbidden() is True
    assert settings.confirm_on_accept_effective() is False


def test_confirm_on_accept_blocked_in_staging_live(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENABLE_CONFIRM_ON_ACCEPT", True, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    assert settings.confirm_on_accept_forbidden() is True
    assert settings.confirm_on_accept_effective() is False


def test_confirm_on_accept_allowed_in_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_CONFIRM_ON_ACCEPT", True, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "dev", raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    assert settings.confirm_on_accept_forbidden() is False
    assert settings.confirm_on_accept_effective() is True


def test_confirm_on_accept_allowed_staging_with_mock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENABLE_CONFIRM_ON_ACCEPT", True, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    assert settings.confirm_on_accept_forbidden() is False
    assert settings.confirm_on_accept_effective() is True


def test_mock_complete_unchanged(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, payment_id = _create_ongoing(db, pi_id=pi_id)
    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
        assert round(float(pay.total_amount), 2) == round(float(completed.final_price), 2)
    finally:
        db.close()


def test_complete_unconfirmed_updates_then_captures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)

    pi_id = f"pi_test_{uuid.uuid4().hex[:20]}"
    driver_id, trip_id, payment_id = _create_ongoing(db, pi_id=pi_id)

    calls: dict[str, list] = {"update": [], "confirm": [], "capture": []}

    def fake_retrieve(_pi: str) -> SimpleNamespace:
        return SimpleNamespace(status="requires_confirmation", amount=50, currency="eur")

    def fake_update(_pi: str, *, amount_cents: int, idempotency_key: str) -> None:
        calls["update"].append(amount_cents)

    def fake_confirm(_pi: str, **_kwargs: object) -> None:
        calls["confirm"].append(_pi)

    def fake_capture(_pi: str, *, idempotency_key: str) -> None:
        calls["capture"].append(_pi)

    monkeypatch.setattr(trip_service, "retrieve_payment_intent", fake_retrieve)
    monkeypatch.setattr(trip_service, "update_payment_intent_amount", fake_update)
    monkeypatch.setattr(trip_service, "confirm_payment_intent", fake_confirm)
    monkeypatch.setattr(trip_service, "capture_payment_intent", fake_capture)

    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        assert calls["update"]
        assert calls["update"][0] == final_price_cents(completed.final_price)
        assert calls["confirm"]
        assert calls["capture"]
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
    finally:
        db.close()


def test_complete_requires_capture_placeholder_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)

    pi_id = f"pi_test_{uuid.uuid4().hex[:20]}"
    driver_id, trip_id, payment_id = _create_ongoing(db, pi_id=pi_id)

    captured = {"n": 0}

    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        lambda _pi: SimpleNamespace(
            status="requires_capture", amount=50, currency="eur"
        ),
    )

    def boom_capture(*_a: object, **_k: object) -> None:
        captured["n"] += 1
        raise AssertionError("must not capture placeholder")

    monkeypatch.setattr(trip_service, "capture_payment_intent", boom_capture)

    try:
        with pytest.raises(HTTPException) as ei:
            trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
        assert ei.value.status_code == 409
        assert ei.value.detail == "payment_amount_mismatch"
        assert captured["n"] == 0
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert trip.status == TripStatus.ongoing
        assert pay.status == PaymentStatus.processing
    finally:
        db.close()


def test_complete_requires_capture_matching_amount_passes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)

    pi_id = f"pi_test_{uuid.uuid4().hex[:20]}"
    driver_id, trip_id, payment_id = _create_ongoing(db, pi_id=pi_id)

    # Precompute fare for 3km / 10min with default pricing (+ no pet).
    # complete_trip will compute the same; we set retrieve amount after first call.
    # Use side_effect that returns matching amount once we know final — simpler:
    # patch retrieve to return amount based on final_price_cents of expected fare.
    from app.core.pricing import calculate_fare_breakdown

    expected = float(calculate_fare_breakdown(3.0, 10.0).total)
    expected_cents = final_price_cents(expected)

    monkeypatch.setattr(
        trip_service,
        "retrieve_payment_intent",
        lambda _pi: SimpleNamespace(
            status="requires_capture", amount=expected_cents, currency="eur"
        ),
    )
    captures: list[str] = []
    monkeypatch.setattr(
        trip_service,
        "capture_payment_intent",
        lambda _pi, *, idempotency_key: captures.append(_pi),
    )

    try:
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        assert completed.status == TripStatus.completed
        assert captures == [pi_id]
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
        assert round(float(pay.total_amount), 2) == round(expected, 2)
    finally:
        db.close()


def test_complete_idempotent_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    driver_id, trip_id, _payment_id = _create_ongoing(db, pi_id=pi_id)
    try:
        first = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
        second = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
        assert first.status == TripStatus.completed
        assert second.status == TripStatus.completed
        assert first.id == second.id
    finally:
        db.close()


def test_webhook_succeeded_amount_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)
    db = _db()
    try:
        driver_id, trip_id, payment_id = _create_ongoing(
            db, pi_id=f"pi_test_{uuid.uuid4().hex[:20]}", payment_total=12.0
        )
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.status = TripStatus.completed
        trip.final_price = 12.0
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        pay.total_amount = 12.0
        db.commit()
        monkeypatch.setattr(
            settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False
        )
        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1200,
                    "currency": "eur",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
            return_value=event,
        ):
            r = client.post(
                "/webhooks/stripe",
                content=b"{}",
                headers={"stripe-signature": "v1=x"},
            )
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        _ = driver_id
    finally:
        db.close()


def test_webhook_succeeded_amount_mismatch_keeps_processing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(app)
    db = _db()
    try:
        _driver_id, trip_id, payment_id = _create_ongoing(
            db, pi_id=f"pi_test_{uuid.uuid4().hex[:20]}", payment_total=12.0
        )
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.status = TripStatus.completed
        trip.final_price = 12.0
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        pay.total_amount = 12.0
        db.commit()
        monkeypatch.setattr(
            settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False
        )
        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 50,
                    "currency": "eur",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
            return_value=event,
        ):
            r = client.post(
                "/webhooks/stripe",
                content=b"{}",
                headers={"stripe-signature": "v1=x"},
            )
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.processing
    finally:
        db.close()


def test_webhook_succeeded_currency_mismatch(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)
    db = _db()
    try:
        _driver_id, trip_id, payment_id = _create_ongoing(
            db, pi_id=f"pi_test_{uuid.uuid4().hex[:20]}", payment_total=12.0
        )
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.status = TripStatus.completed
        trip.final_price = 12.0
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        pay.total_amount = 12.0
        db.commit()
        monkeypatch.setattr(
            settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False
        )
        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1200,
                    "currency": "usd",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
            return_value=event,
        ):
            assert (
                client.post(
                    "/webhooks/stripe",
                    content=b"{}",
                    headers={"stripe-signature": "v1=x"},
                ).status_code
                == 200
            )
        db.refresh(pay)
        assert pay.status == PaymentStatus.processing
    finally:
        db.close()


def test_reconcile_succeeded_amount_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    try:
        _driver_id, trip_id, payment_id = _create_ongoing(
            db, pi_id=f"pi_test_{uuid.uuid4().hex[:20]}", payment_total=10.0
        )
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.status = TripStatus.completed
        trip.final_price = 10.0
        db.commit()

        def fake_retrieve(_pi: str) -> MagicMock:
            m = MagicMock()
            m.status = "succeeded"
            m.amount = 1000
            m.currency = "eur"
            return m

        monkeypatch.setattr(
            "app.services.admin_payment_reconciliation.retrieve_payment_intent",
            fake_retrieve,
        )
        out = reconcile_single_trip_payment_with_stripe(
            db,
            trip_id=trip_id,
            actor_user_id=str(uuid.uuid4()),
            governance_reason="teste amount ok reconcile",
            dry_run=False,
        )
        assert out.get("action") == "updated_succeeded"
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_reconcile_succeeded_amount_mismatch_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    try:
        _driver_id, trip_id, payment_id = _create_ongoing(
            db, pi_id=f"pi_test_{uuid.uuid4().hex[:20]}", payment_total=10.0
        )
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.status = TripStatus.completed
        trip.final_price = 10.0
        db.commit()

        def fake_retrieve(_pi: str) -> MagicMock:
            m = MagicMock()
            m.status = "succeeded"
            m.amount = 50
            m.currency = "eur"
            return m

        monkeypatch.setattr(
            "app.services.admin_payment_reconciliation.retrieve_payment_intent",
            fake_retrieve,
        )
        out = reconcile_single_trip_payment_with_stripe(
            db,
            trip_id=trip_id,
            actor_user_id=str(uuid.uuid4()),
            governance_reason="teste amount mismatch reconcile",
            dry_run=False,
        )
        assert out.get("action") == "blocked_amount_mismatch"
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert pay.status == PaymentStatus.processing
    finally:
        db.close()


def test_cancel_before_complete_keeps_trip_cancelled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Smoke: passenger cancel after accept cancels without capturing."""
    db = _db()
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
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
    db.add(
        Payment(
            trip_id=trip.id,
            total_amount=0.50,
            commission_amount=0.08,
            driver_amount=0.42,
            currency="EUR",
            status=PaymentStatus.processing,
            stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:20]}",
        )
    )
    db.commit()
    try:
        cancelled = trip_service.cancel_trip_by_passenger(
            db=db, passenger_id=str(passenger.id), trip_id=str(trip.id), reason="test"
        )
        assert cancelled.status == TripStatus.cancelled
    finally:
        db.close()
