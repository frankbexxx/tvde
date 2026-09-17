"""L-PAY-01: Stripe webhook marker + Payment update must share one transaction."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.stripe_webhook_event import StripeWebhookEvent
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _insert_payment(
    db: Session,
    *,
    status: PaymentStatus = PaymentStatus.processing,
    total: float = 10.0,
) -> Payment:
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
        status=status,
        stripe_payment_intent_id=f"pi_lpay01_{uuid.uuid4().hex}",
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


def _marker_exists(db: Session, evt_id: str) -> bool:
    row = db.get(StripeWebhookEvent, evt_id)
    return row is not None


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_webhook_succeeded_happy_path_atomic(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_ok_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        r = _post_webhook(client, event)
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_id)
    finally:
        db.close()


def test_webhook_failed_happy_path_atomic(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_fail_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                }
            },
        }
        r = _post_webhook(client, event)
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.failed
        assert _marker_exists(db, evt_id)
    finally:
        db.close()


def test_webhook_duplicate_event_ack_without_reprocess(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_dup_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        assert _post_webhook(client, event).status_code == 200
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_id)
    finally:
        db.close()


def test_webhook_db_error_after_marker_rolls_back_and_returns_5xx(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Simulate failure after INSERT claim, before Payment status update."""
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_midfail_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.expected_payment_cents",
            side_effect=SQLAlchemyError("simulated mid-flight db error"),
        ):
            r = _post_webhook(client, event)
        assert r.status_code == 500
        assert r.json()["detail"] == "webhook_db_error"
        db.expire_all()
        db.refresh(pay)
        assert pay.status == PaymentStatus.processing
        assert not _marker_exists(db, evt_id)
    finally:
        db.close()


def test_webhook_retry_after_midflight_failure_succeeds(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_retry_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.expected_payment_cents",
            side_effect=SQLAlchemyError("simulated mid-flight db error"),
        ):
            assert _post_webhook(client, event).status_code == 500
        assert not _marker_exists(db, evt_id)

        r = _post_webhook(client, event)
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_id)
    finally:
        db.close()


def test_webhook_amount_mismatch_keeps_processing_and_persists_marker(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """L-PAY-02 behaviour preserved: fail-closed + ACK 200; marker committed."""
    db = _db()
    try:
        pay = _insert_payment(db, total=12.0)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_lpay01_mismatch_{uuid.uuid4().hex}"
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
        assert _marker_exists(db, evt_id)
    finally:
        db.close()
