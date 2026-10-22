"""T-O3: webhook succeeded amount mismatch → payment_anomalies (PR1)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.payment_anomaly import PaymentAnomaly
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus
from app.services.payment_anomalies import ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _insert_payment(db: Session, *, total: float = 12.0) -> Payment:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=total,
        final_price=total,
        distance_km=3.0,
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()
    pay = Payment(
        trip_id=trip.id,
        total_amount=total,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=f"pi_anom_mm_{uuid.uuid4().hex}",
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay


def _post_webhook(client: TestClient, event: dict) -> object:
    with patch(
        "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
        return_value=event,
    ):
        return client.post(
            "/webhooks/stripe",
            content=b"{}",
            headers={"stripe-signature": "v1=test"},
        )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_mismatch_persists_anomaly_and_keeps_processing(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, total=12.0)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        evt_id = f"evt_anom_mm_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
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
        r = _post_webhook(client, event)
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.processing
        row = db.execute(
            select(PaymentAnomaly).where(PaymentAnomaly.stripe_event_id == evt_id)
        ).scalar_one()
        assert row.anomaly_type == ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH
        assert row.severity == "warning"
        assert row.payment_id == pay.id
        assert row.trip_id == pay.trip_id
        assert row.payload_json.get("reason")
        assert "client_secret" not in row.payload_json
    finally:
        db.close()


def test_mismatch_no_anomaly_when_flag_off(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, total=12.0)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False, raising=False)
        evt_id = f"evt_anom_mm_off_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
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
        r = _post_webhook(client, event)
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.processing
        found = db.execute(
            select(PaymentAnomaly).where(PaymentAnomaly.stripe_event_id == evt_id)
        ).scalar_one_or_none()
        assert found is None
    finally:
        db.close()
