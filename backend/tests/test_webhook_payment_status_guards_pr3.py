"""PR3 — webhook payment status guards (Q1 recovery, Q2 regression block)."""

from __future__ import annotations

import asyncio
import contextvars
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.payment_anomaly import PaymentAnomaly
from app.db.models.stripe_webhook_event import StripeWebhookEvent
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.api.routers.webhooks import stripe as stripe_webhook_mod
from app.main import app
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus
from app.services import payment_anomalies as payment_anomalies_mod
from app.services.payment_anomalies import (
    ANOMALY_WEBHOOK_STATUS_RECOVERY,
    ANOMALY_WEBHOOK_STATUS_REGRESSION_BLOCKED,
    record_payment_anomaly,
)
from tests.support.unique_phone import unique_test_phone

_stripe_test_event: contextvars.ContextVar[dict | None] = contextvars.ContextVar(
    "stripe_test_event", default=None
)


def _construct_stripe_event_from_context(*_args: object, **_kwargs: object) -> dict:
    ev = _stripe_test_event.get()
    if ev is None:
        raise ValueError("missing stripe test event in contextvar")
    return ev


def _db() -> Session:
    return SessionLocal()


def _insert_payment(
    db: Session,
    *,
    status: PaymentStatus = PaymentStatus.processing,
    total: float = 10.0,
    trip_status: TripStatus = TripStatus.completed,
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
        status=trip_status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=total,
        final_price=total,
        distance_km=3.0,
        duration_min=10.0,
        completed_at=datetime.now(timezone.utc)
        if trip_status == TripStatus.completed
        else None,
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
        stripe_payment_intent_id=f"pi_pr3_{uuid.uuid4().hex}",
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay


def _succeeded_event(pay: Payment, *, evt_id: str | None = None) -> dict:
    return {
        "id": evt_id or f"evt_pr3_succ_{uuid.uuid4().hex}",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": pay.stripe_payment_intent_id,
                "object": "payment_intent",
                "amount": int(round(pay.total_amount * 100)),
                "currency": "eur",
            }
        },
    }


def _failed_event(pay: Payment, *, evt_id: str | None = None) -> dict:
    return {
        "id": evt_id or f"evt_pr3_fail_{uuid.uuid4().hex}",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": pay.stripe_payment_intent_id,
                "object": "payment_intent",
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


def _marker_exists(db: Session, evt_id: str) -> bool:
    return db.get(StripeWebhookEvent, evt_id) is not None


def _count_anomalies(db: Session, anomaly_type: str, evt_id: str) -> int:
    rows = (
        db.execute(
            select(PaymentAnomaly).where(
                PaymentAnomaly.anomaly_type == anomaly_type,
                PaymentAnomaly.stripe_event_id == evt_id,
            )
        )
        .scalars()
        .all()
    )
    return len(rows)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _webhook_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)


def test_processing_to_succeeded(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        assert _post_webhook(client, _succeeded_event(pay)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_processing_to_failed(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        assert _post_webhook(client, _failed_event(pay)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


def test_failed_to_succeeded_with_valid_guard(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.failed)
        evt_id = f"evt_pr3_recovery_{uuid.uuid4().hex}"
        monkeypatch.setattr(
            settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False
        )
        with patch("app.api.routers.webhooks.stripe.log_event") as mock_log:
            assert (
                _post_webhook(client, _succeeded_event(pay, evt_id=evt_id)).status_code
                == 200
            )
            mock_log.assert_any_call(
                "stripe_webhook_status_recovery",
                trip_id=str(pay.trip_id),
                payment_id=str(pay.id),
                payment_intent_id=pay.stripe_payment_intent_id,
                stripe_event_id=evt_id,
                from_status="failed",
                to_status="succeeded",
                stripe_amount_cents=1000,
                expected_amount_cents=1000,
            )
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_RECOVERY, evt_id) == 1
    finally:
        db.close()


def test_failed_to_succeeded_amount_mismatch_stays_failed(
    client: TestClient,
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.failed, total=12.0)
        event = _succeeded_event(pay)
        event["data"]["object"]["amount"] = 50
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


def test_succeeded_to_failed_blocked(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.succeeded)
        evt_id = f"evt_pr3_block_{uuid.uuid4().hex}"
        monkeypatch.setattr(
            settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False
        )
        assert _post_webhook(client, _failed_event(pay, evt_id=evt_id)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_REGRESSION_BLOCKED, evt_id) == 1
    finally:
        db.close()


def test_out_of_order_succeeded_then_failed(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        assert _post_webhook(
            client, _succeeded_event(pay, evt_id=f"evt_pr3_ord_s_{uuid.uuid4().hex}")
        ).status_code == 200
        assert _post_webhook(
            client, _failed_event(pay, evt_id=f"evt_pr3_ord_f_{uuid.uuid4().hex}")
        ).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_out_of_order_failed_then_succeeded(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        assert _post_webhook(
            client, _failed_event(pay, evt_id=f"evt_pr3_ord2_f_{uuid.uuid4().hex}")
        ).status_code == 200
        assert _post_webhook(
            client, _succeeded_event(pay, evt_id=f"evt_pr3_ord2_s_{uuid.uuid4().hex}")
        ).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_regression_blocked_does_not_terminate_ongoing_trip(
    client: TestClient,
) -> None:
    db = _db()
    try:
        pay = _insert_payment(
            db,
            status=PaymentStatus.succeeded,
            trip_status=TripStatus.ongoing,
        )
        trip = db.get(Trip, pay.trip_id)
        assert trip is not None
        assert _post_webhook(client, _failed_event(pay)).status_code == 200
        db.refresh(trip)
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert trip.status == TripStatus.ongoing
    finally:
        db.close()


def test_anomaly_persist_off_writes_no_rows(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.failed)
        evt_id = f"evt_pr3_noflag_{uuid.uuid4().hex}"
        monkeypatch.setattr(
            settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False, raising=False
        )
        assert _post_webhook(client, _succeeded_event(pay, evt_id=evt_id)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_RECOVERY, evt_id) == 0
    finally:
        db.close()


def test_pr3_recovery_real_pg_anomaly_fk_failure_commits_marker_and_succeeded(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Real PostgreSQL FK on anomaly INSERT (begin_nested) must not abort outer txn."""
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.failed)
        evt_id = f"evt_pr3_rec_fk_{uuid.uuid4().hex}"
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)

        real_record = payment_anomalies_mod.record_payment_anomaly

        def _record_with_bad_fk(db_sess: Session, **kwargs: object) -> bool:
            kw = dict(kwargs)
            if kw.get("anomaly_type") == ANOMALY_WEBHOOK_STATUS_RECOVERY:
                kw["payment_id"] = uuid.uuid4()
            return real_record(db_sess, **kw)

        monkeypatch.setattr(
            "app.api.routers.webhooks.stripe.record_payment_anomaly",
            _record_with_bad_fk,
        )
        assert _post_webhook(client, _succeeded_event(pay, evt_id=evt_id)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_id)
        assert _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_RECOVERY, evt_id) == 0
    finally:
        db.close()


def test_pr3_regression_blocked_real_pg_anomaly_fk_failure_commits_marker(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.succeeded)
        evt_id = f"evt_pr3_reg_fk_{uuid.uuid4().hex}"
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)

        real_record = payment_anomalies_mod.record_payment_anomaly

        def _record_with_bad_fk(db_sess: Session, **kwargs: object) -> bool:
            kw = dict(kwargs)
            if kw.get("anomaly_type") == ANOMALY_WEBHOOK_STATUS_REGRESSION_BLOCKED:
                kw["payment_id"] = uuid.uuid4()
            return real_record(db_sess, **kw)

        monkeypatch.setattr(
            "app.api.routers.webhooks.stripe.record_payment_anomaly",
            _record_with_bad_fk,
        )
        assert _post_webhook(client, _failed_event(pay, evt_id=evt_id)).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_id)
        assert (
            _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_REGRESSION_BLOCKED, evt_id) == 0
        )
    finally:
        db.close()


def test_record_pr3_anomaly_types_fk_violation_uses_savepoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Direct call: FK failure on recovery/regression anomaly rows — outer txn survives."""
    db = _db()
    try:
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        pay = _insert_payment(db, status=PaymentStatus.processing)
        evt_recovery = f"evt_pr3_sp_rec_{uuid.uuid4().hex}"
        evt_block = f"evt_pr3_sp_blk_{uuid.uuid4().hex}"
        db.execute(insert(StripeWebhookEvent).values(stripe_event_id=evt_recovery))
        db.execute(insert(StripeWebhookEvent).values(stripe_event_id=evt_block))
        bogus = uuid.uuid4()
        assert (
            record_payment_anomaly(
                db,
                anomaly_type=ANOMALY_WEBHOOK_STATUS_RECOVERY,
                severity="info",
                stripe_event_id=evt_recovery,
                payment_intent_id=pay.stripe_payment_intent_id,
                payment_id=bogus,
                trip_id=pay.trip_id,
                event_type="payment_intent.succeeded",
                payload_json={"from_status": "failed", "to_status": "succeeded"},
            )
            is False
        )
        assert (
            record_payment_anomaly(
                db,
                anomaly_type=ANOMALY_WEBHOOK_STATUS_REGRESSION_BLOCKED,
                severity="warning",
                stripe_event_id=evt_block,
                payment_intent_id=pay.stripe_payment_intent_id,
                payment_id=bogus,
                trip_id=pay.trip_id,
                event_type="payment_intent.payment_failed",
                payload_json={"note": "succeeded_to_failed_denied"},
            )
            is False
        )
        pay.status = PaymentStatus.succeeded
        db.commit()
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert _marker_exists(db, evt_recovery)
        assert _marker_exists(db, evt_block)
    finally:
        db.close()


def test_charge_refunded_preserves_succeeded_status(client: TestClient) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.succeeded, total=10.0)
        evt_id = f"evt_pr3_ref_{uuid.uuid4().hex}"
        event = {
            "id": evt_id,
            "type": "charge.refunded",
            "data": {
                "object": {
                    "id": "ch_pr3_test",
                    "object": "charge",
                    "payment_intent": pay.stripe_payment_intent_id,
                    "amount_refunded": 1000,
                    "currency": "eur",
                }
            },
        }
        assert _post_webhook(client, event).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
        assert float(pay.refunded_amount) == 10.0
    finally:
        db.close()


def test_payment_loader_select_uses_for_update() -> None:
    """Static guarantee: webhook payment load issues FOR UPDATE OF payments."""
    from sqlalchemy.dialects import postgresql

    loader = stripe_webhook_mod._load_payment_for_webhook_update
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        pi_key = pay.stripe_payment_intent_id or ""
        captured: list[str] = []

        original_execute = db.execute

        def _spy_execute(statement, *args, **kwargs):  # type: ignore[no-untyped-def]
            try:
                compiled = statement.compile(dialect=postgresql.dialect())
                captured.append(str(compiled))
            except Exception:
                pass
            return original_execute(statement, *args, **kwargs)

        db.execute = _spy_execute  # type: ignore[method-assign]
        loader(db, pi_key)
        assert captured, "expected execute to run"
        assert any("FOR UPDATE" in sql.upper() for sql in captured), captured
    finally:
        db.close()


def test_concurrent_for_update_two_db_sessions() -> None:
    """Two independent SessionLocal() workers contend on the same Payment row."""
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.processing)
        pi_key = pay.stripe_payment_intent_id or ""
        pay_id = pay.id
    finally:
        db.close()

    barrier = threading.Barrier(2)
    errors: list[BaseException] = []
    locked: list[bool] = []

    def _worker() -> None:
        sess = SessionLocal()
        try:
            barrier.wait(timeout=10)
            row = stripe_webhook_mod._load_payment_for_webhook_update(sess, pi_key)
            assert row is not None
            locked.append(True)
            sess.commit()
        except BaseException as exc:
            errors.append(exc)
        finally:
            sess.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futs = [pool.submit(_worker), pool.submit(_worker)]
        for f in futs:
            f.result(timeout=30)

    assert not errors, errors
    assert len(locked) == 2
    verify = _db()
    try:
        final = verify.get(Payment, pay_id)
        assert final is not None
    finally:
        verify.close()


async def _run_concurrent_succeeded_vs_failed_webhooks_async(
    pay: Payment,
) -> tuple[list[int], str, str]:
    """
    Two concurrent HTTP requests via httpx AsyncClient — separate SQLAlchemy sessions.
    asyncio.Barrier aligns handler entry; distinct evt_* per request.
    """
    from httpx import ASGITransport, AsyncClient

    evt_succ = f"evt_pr3_conc_s_{uuid.uuid4().hex}"
    evt_fail = f"evt_pr3_conc_f_{uuid.uuid4().hex}"
    barrier = asyncio.Barrier(2)
    succ_event = _succeeded_event(pay, evt_id=evt_succ)
    fail_event = _failed_event(pay, evt_id=evt_fail)

    transport = ASGITransport(app=app)

    async def _post(event: dict) -> int:
        await barrier.wait()
        token = _stripe_test_event.set(event)
        try:
            async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
                r = await ac.post(
                    "/webhooks/stripe",
                    content=b"{}",
                    headers={"stripe-signature": "v1=test"},
                )
                return r.status_code
        finally:
            _stripe_test_event.reset(token)

    with patch(
        "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
        side_effect=_construct_stripe_event_from_context,
    ):
        codes = list(await asyncio.gather(_post(succ_event), _post(fail_event)))
    return codes, evt_succ, evt_fail


def test_concurrent_succeeded_and_failed_events() -> None:
    """Concurrent evt_* on same PI — final state succeeded; both markers persisted."""
    db = _db()
    try:
        for iteration in range(3):
            pay = _insert_payment(db, status=PaymentStatus.processing)
            pay_id = pay.id
            pi = pay.stripe_payment_intent_id
            codes, evt_succ, evt_fail = asyncio.run(
                _run_concurrent_succeeded_vs_failed_webhooks_async(pay)
            )
            assert codes == [200, 200], f"iteration={iteration} codes={codes}"
            db.expire_all()
            final = db.get(Payment, pay_id)
            assert final is not None
            assert final.stripe_payment_intent_id == pi
            assert final.status == PaymentStatus.succeeded
            assert _marker_exists(db, evt_succ)
            assert _marker_exists(db, evt_fail)
    finally:
        db.close()


def test_duplicate_recovery_anomaly_idempotent(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        pay = _insert_payment(db, status=PaymentStatus.failed)
        evt_id = f"evt_pr3_duprec_{uuid.uuid4().hex}"
        event = _succeeded_event(pay, evt_id=evt_id)
        monkeypatch.setattr(
            settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False
        )
        assert _post_webhook(client, event).status_code == 200
        assert _post_webhook(client, event).status_code == 200
        assert _count_anomalies(db, ANOMALY_WEBHOOK_STATUS_RECOVERY, evt_id) == 1
    finally:
        db.close()
