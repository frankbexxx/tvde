"""STRIPE-LIVE-02 F2: charge.refunded webhook sync."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.stripe_webhook_event import StripeWebhookEvent
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus
from app.services.payment_refund import payment_refund_api_fields
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _insert_payment(
    db: Session,
    *,
    status: PaymentStatus = PaymentStatus.succeeded,
    total: float = 4.5,
    refunded: float = 0.0,
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
        commission_amount=0.5,
        driver_amount=total - 0.5,
        currency="EUR",
        status=status,
        stripe_payment_intent_id=f"pi_refund_{uuid.uuid4().hex}",
        refunded_amount=refunded,
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay


def _charge_refunded_event(
    pay: Payment,
    *,
    evt_id: str,
    amount_refunded_cents: int,
) -> dict:
    return {
        "id": evt_id,
        "type": "charge.refunded",
        "data": {
            "object": {
                "id": f"ch_{uuid.uuid4().hex[:16]}",
                "object": "charge",
                "payment_intent": pay.stripe_payment_intent_id,
                "amount_refunded": amount_refunded_cents,
                "currency": "eur",
            }
        },
    }


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


def test_new_payment_defaults_refunded_amount_zero(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        assert float(pay.refunded_amount) == 0.0
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_webhook_charge_refunded_full(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, total=4.5)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_refund_full_{uuid.uuid4().hex}"
        r = _post_webhook(client, _charge_refunded_event(pay, evt_id=evt_id, amount_refunded_cents=450))
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert float(pay.refunded_amount) == 4.5
        ra, rs = payment_refund_api_fields(pay)
        assert ra == 4.5
        assert rs == "full"
        assert db.get(StripeWebhookEvent, evt_id) is not None
    finally:
        db.close()


def test_webhook_charge_refunded_partial(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, total=4.5)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_refund_partial_{uuid.uuid4().hex}"
        r = _post_webhook(
            client, _charge_refunded_event(pay, evt_id=evt_id, amount_refunded_cents=200)
        )
        assert r.status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert float(pay.refunded_amount) == 2.0
        _, rs = payment_refund_api_fields(pay)
        assert rs == "partial"
    finally:
        db.close()


def test_webhook_charge_refunded_duplicate_evt_no_double_apply(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        evt_id = f"evt_refund_dup_{uuid.uuid4().hex}"
        event = _charge_refunded_event(pay, evt_id=evt_id, amount_refunded_cents=450)
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        first = float(pay.refunded_amount)
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        assert float(pay.refunded_amount) == first == 4.5
    finally:
        db.close()


def test_webhook_charge_refunded_out_of_order_full_then_partial(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        _post_webhook(
            client,
            _charge_refunded_event(
                pay, evt_id=f"evt_refund_ord1_{uuid.uuid4().hex}", amount_refunded_cents=450
            ),
        )
        db.refresh(pay)
        assert float(pay.refunded_amount) == 4.5
        _post_webhook(
            client,
            _charge_refunded_event(
                pay, evt_id=f"evt_refund_ord2_{uuid.uuid4().hex}", amount_refunded_cents=200
            ),
        )
        db.refresh(pay)
        assert float(pay.refunded_amount) == 4.5
    finally:
        db.close()


def test_webhook_charge_refunded_payment_not_found_still_ok(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
    evt_id = f"evt_refund_missing_{uuid.uuid4().hex}"
    event = {
        "id": evt_id,
        "type": "charge.refunded",
        "data": {
            "object": {
                "id": "ch_missing",
                "object": "charge",
                "payment_intent": f"pi_unknown_{uuid.uuid4().hex}",
                "amount_refunded": 100,
                "currency": "eur",
            }
        },
    }
    r = _post_webhook(client, event)
    assert r.status_code == 200
    db = _db()
    try:
        assert db.get(StripeWebhookEvent, evt_id) is not None
    finally:
        db.close()


def test_webhook_succeeded_regression_unchanged(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        event = {
            "id": f"evt_pi_ok_{uuid.uuid4().hex}",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": pay.stripe_payment_intent_id,
                    "object": "payment_intent",
                    "amount": 450,
                    "currency": "eur",
                }
            },
        }
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert float(pay.refunded_amount) == 0.0
    finally:
        db.close()


def test_passenger_detail_exposes_refund_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, refunded=4.5)
        trip = db.get(Trip, pay.trip_id)
        assert trip is not None
        passenger_id = trip.passenger_id
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)

        async def _user() -> UserContext:
            return UserContext(user_id=str(passenger_id), role=Role.passenger)

        def _db_dep():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_current_user] = _user
        app.dependency_overrides[get_db] = _db_dep
        r = client.get(f"/trips/{trip.id}")
        assert r.status_code == 200
        body = r.json()
        assert body["payment_status"] == "succeeded"
        assert body["refunded_amount"] == 4.5
        assert body["refund_status"] == "full"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_admin_trip_support_payment_block_refund_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, refunded=2.0)
        trip = db.get(Trip, pay.trip_id)
        assert trip is not None

        async def _admin() -> UserContext:
            return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

        app.dependency_overrides[get_current_user] = _admin
        r = client.get(f"/admin/trips/{trip.id}")
        assert r.status_code == 200
        body = r.json()
        assert body["refunded_amount"] == 2.0
        assert body["refund_status"] == "partial"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.close()
