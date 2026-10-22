"""T-O2: webhook payment not found → optional payment_anomalies row (PR1)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.payment_anomaly import PaymentAnomaly
from app.db.models.stripe_webhook_event import StripeWebhookEvent
from app.db.session import SessionLocal
from app.main import app
from app.services import payment_anomalies as payment_anomalies_mod
from app.services.payment_anomalies import (
    ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
    SEVERITY_WARNING,
    record_payment_anomaly,
)


def _db() -> Session:
    return SessionLocal()


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


def _count_anomalies(db: Session, evt_id: str) -> int:
    return (
        db.execute(
            select(func.count())
            .select_from(PaymentAnomaly)
            .where(
                PaymentAnomaly.anomaly_type == ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
                PaymentAnomaly.stripe_event_id == evt_id,
            )
        ).scalar_one()
        or 0
    )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_not_found_persists_anomaly_when_flag_on(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        orphan_pi = f"pi_anom_nf_{uuid.uuid4().hex}"
        evt_id = f"evt_anom_nf_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": orphan_pi,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        r = _post_webhook(client, event)
        assert r.status_code == 200
        assert _count_anomalies(db, evt_id) == 1
        row = db.execute(
            select(PaymentAnomaly).where(PaymentAnomaly.stripe_event_id == evt_id)
        ).scalar_one()
        assert row.severity == "warning"
        assert row.payment_intent_id == orphan_pi
        assert db.get(StripeWebhookEvent, evt_id) is not None
        assert (
            db.execute(
                select(Payment).where(Payment.stripe_payment_intent_id == orphan_pi)
            ).scalar_one_or_none()
            is None
        )
    finally:
        db.close()


def test_not_found_no_anomaly_when_flag_off(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False, raising=False)
        orphan_pi = f"pi_anom_off_{uuid.uuid4().hex}"
        evt_id = f"evt_anom_off_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": orphan_pi,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        r = _post_webhook(client, event)
        assert r.status_code == 200
        assert _count_anomalies(db, evt_id) == 0
        assert db.get(StripeWebhookEvent, evt_id) is not None
    finally:
        db.close()


def test_not_found_duplicate_evt_single_anomaly(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        orphan_pi = f"pi_anom_dup_{uuid.uuid4().hex}"
        evt_id = f"evt_anom_dup_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": orphan_pi,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        assert _post_webhook(client, event).status_code == 200
        assert _post_webhook(client, event).status_code == 200
        assert _count_anomalies(db, evt_id) == 1
    finally:
        db.close()


def test_not_found_anomaly_persist_failure_still_200(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        orphan_pi = f"pi_anom_fail_{uuid.uuid4().hex}"
        evt_id = f"evt_anom_fail_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": orphan_pi,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        with patch(
            "app.api.routers.webhooks.stripe.record_payment_anomaly",
            side_effect=RuntimeError("simulated anomaly persist failure"),
        ):
            r = _post_webhook(client, event)
        assert r.status_code == 200
        assert db.get(StripeWebhookEvent, evt_id) is not None
    finally:
        db.close()


def test_record_anomaly_fk_violation_does_not_poison_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Real PostgreSQL FK failure on anomaly INSERT must not abort outer transaction."""
    db = _db()
    try:
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        evt_id = f"evt_savepoint_{uuid.uuid4().hex}"
        db.execute(insert(StripeWebhookEvent).values(stripe_event_id=evt_id))
        bogus_payment_id = uuid.uuid4()
        ok = record_payment_anomaly(
            db,
            anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
            severity=SEVERITY_WARNING,
            stripe_event_id=evt_id,
            payment_intent_id=f"pi_savepoint_{uuid.uuid4().hex}",
            payment_id=bogus_payment_id,
            event_type="payment_intent.succeeded",
            payload_json={"note": "fk_test"},
        )
        assert ok is False
        db.commit()
        assert db.get(StripeWebhookEvent, evt_id) is not None
        assert _count_anomalies(db, evt_id) == 0
        # Session still usable after commit.
        db.execute(select(func.count()).select_from(StripeWebhookEvent))
    finally:
        db.close()


def test_not_found_real_anomaly_fk_failure_webhook_still_200_and_marker(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Webhook path: failed anomaly INSERT (FK) must not block evt marker commit."""
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)

        def _record_with_bad_fk(db_sess: Session, **kwargs: object) -> bool:
            kwargs["payment_id"] = uuid.uuid4()
            return payment_anomalies_mod.record_payment_anomaly(db_sess, **kwargs)

        monkeypatch.setattr(
            "app.api.routers.webhooks.stripe.record_payment_anomaly",
            _record_with_bad_fk,
        )
        orphan_pi = f"pi_anom_fk_{uuid.uuid4().hex}"
        evt_id = f"evt_anom_fk_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": orphan_pi,
                    "object": "payment_intent",
                    "amount": 1000,
                    "currency": "eur",
                }
            },
        }
        r = _post_webhook(client, event)
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}
        assert db.get(StripeWebhookEvent, evt_id) is not None
        assert _count_anomalies(db, evt_id) == 0
        assert (
            db.execute(
                select(Payment).where(Payment.stripe_payment_intent_id == orphan_pi)
            ).scalar_one_or_none()
            is None
        )
    finally:
        db.close()
