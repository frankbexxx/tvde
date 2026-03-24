"""A022 hardening: webhook handler + complete_trip with metrics and STRIPE_MOCK.

Requires PostgreSQL (same DATABASE_URL as rest of backend tests).
"""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from sqlalchemy import text
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.trips import complete_trip


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido para testes A022: {exc}")


def _session() -> Session:
    return SessionLocal()


def test_stripe_webhook_marks_payment_succeeded(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _session()
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.ongoing,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        distance_km=3.0,
        duration_min=12.0,
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
        stripe_payment_intent_id="pi_webhook_test_001",
    )
    db.add(payment)
    db.commit()

    event = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_webhook_test_001",
                "object": "payment_intent",
            }
        },
    }

    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test_secret", raising=False)
    with patch(
        "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
        return_value=event,
    ):
        client = TestClient(app)
        r = client.post(
            "/webhooks/stripe",
            content=b"{}",
            headers={"stripe-signature": "v1=test"},
        )
        assert r.status_code == 200, r.text

    p2 = db.execute(select(Payment).where(Payment.id == payment.id)).scalar_one()
    assert p2.status == PaymentStatus.succeeded
    db.close()


def test_complete_trip_rejects_missing_metrics() -> None:
    db = _session()
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()
    driver = Driver(
        user_id=driver_user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
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
        distance_km=None,
        duration_min=None,
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
        stripe_payment_intent_id="pi_mock_metrics_test",
    )
    db.add(payment)
    db.commit()
    trip_id = str(trip.id)
    driver_id = str(driver_user.id)

    with pytest.raises(HTTPException) as excinfo:
        complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)

    assert excinfo.value.status_code == 422
    assert excinfo.value.detail == "trip_metrics_required_before_completion"
    db.close()


def test_complete_trip_ongoing_to_completed_with_stripe_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True)
    db = _session()
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()
    driver = Driver(
        user_id=driver_user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
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
        distance_km=4.0,
        duration_min=10.0,
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
        stripe_payment_intent_id="pi_mock_flow_test",
    )
    db.add(payment)
    db.commit()

    out = complete_trip(db=db, driver_id=str(driver_user.id), trip_id=str(trip.id))
    assert out.status == TripStatus.completed
    assert out.final_price is not None
    db.refresh(payment)
    assert payment.status == PaymentStatus.processing
    db.close()
