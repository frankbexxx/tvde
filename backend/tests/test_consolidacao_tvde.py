"""
Testes de consolidação TVDE — documentação de sessão correlata arquivada (ver docs/HISTORICO_FORA_DO_GIT.md).

- Fluxo HTTP real (TestClient) onde faz sentido
- STRIPE_MOCK=True (sem Stripe real)
- Mock mínimo só em stripe.Webhook.construct_event (webhook)
- PostgreSQL obrigatório; skip explícito se indisponível
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus


# --- PostgreSQL obrigatório (doc §8) ---
@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido para testes de consolidação: {exc}")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides() -> None:
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _stripe_mock_for_trip_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sem chamadas Stripe reais nos fluxos de viagem (doc §6, §10)."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)


def _override_user_and_db(db: Session, ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _create_passenger(db: Session) -> str:
    u = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return str(u.id)


def _create_driver_with_location(db: Session, lat: float, lng: float) -> str:
    u = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4().hex[:8]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(d)
    db.flush()
    db.add(
        DriverLocation(
            driver_id=u.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(u)
    return str(u.id)


TRIP_JSON = {
    "origin_lat": 38.7,
    "origin_lng": -9.1,
    "destination_lat": 38.8,
    "destination_lng": -9.2,
}


def _http_create_trip(client: TestClient, db: Session, passenger_id: str) -> str:
    _override_user_and_db(db, UserContext(user_id=passenger_id, role=Role.passenger))
    r = client.post("/trips", json=TRIP_JSON)
    assert r.status_code == 200, r.text
    return r.json()["trip_id"]


def _http_accept_arriving_start_complete(
    client: TestClient, db: Session, driver_id: str, trip_id: str
) -> None:
    _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
    r = client.post(f"/driver/trips/{trip_id}/accept")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "accepted"

    r = client.post(f"/driver/trips/{trip_id}/arriving")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "arriving"

    r = client.post(f"/driver/trips/{trip_id}/start")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ongoing"

    r = client.post(
        f"/driver/trips/{trip_id}/complete",
        json={"final_price": 0.0},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"


def _get_trip_status_db(db: Session, trip_id: str) -> str:
    t = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    return t.status.value


# --- 1. Trip flow (estado base) — doc §1 ---
def test_trip_flow_basic(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _http_accept_arriving_start_complete(client, db, driver_id, trip_id)
        assert _get_trip_status_db(db, trip_id) == "completed"
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- 2. Pricing — métricas obrigatórias — doc §2 ---
def test_complete_trip_requires_metrics(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        r = client.post(f"/driver/trips/{trip_id}/accept")
        assert r.status_code == 200, r.text
        client.post(f"/driver/trips/{trip_id}/arriving")
        client.post(f"/driver/trips/{trip_id}/start")
        db.execute(
            update(Trip)
            .where(Trip.id == trip_id)
            .values(distance_km=None, duration_min=None)
        )
        db.commit()
        r = client.post(f"/driver/trips/{trip_id}/complete", json={"final_price": 0.0})
        assert r.status_code == 422
        assert r.json()["detail"] == "trip_metrics_required_before_completion"
    finally:
        app.dependency_overrides.clear()
        db.close()


def _insert_payment_for_webhook(
    db: Session,
    pi_id: str | None = None,
    status: PaymentStatus = PaymentStatus.processing,
) -> Payment:
    """pi_id único por defeito — evita colisões com corridas anteriores na mesma BD."""
    resolved_pi = pi_id or f"pi_test_{uuid.uuid4().hex}"
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
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()
    pay = Payment(
        trip_id=trip.id,
        total_amount=10.0,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=status,
        stripe_payment_intent_id=resolved_pi,
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay


# --- 3. Webhook succeeded — doc §3 ---
def test_webhook_payment_succeeded(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    db = SessionLocal()
    try:
        pay = _insert_payment_for_webhook(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        event = {
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": pay.stripe_payment_intent_id, "object": "payment_intent"}},
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
    finally:
        db.close()


# --- 4. Webhook failed — doc §4 ---
def test_webhook_payment_failed(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    db = SessionLocal()
    try:
        pay = _insert_payment_for_webhook(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        event = {
            "type": "payment_intent.payment_failed",
            "data": {"object": {"id": pay.stripe_payment_intent_id, "object": "payment_intent"}},
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
        assert pay.status == PaymentStatus.failed
    finally:
        db.close()


# --- 5. Idempotência webhook — doc §5 ---
def test_webhook_idempotency(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    db = SessionLocal()
    try:
        pay = _insert_payment_for_webhook(db)
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        event = {
            "id": "evt_test_idempotency_dup",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": pay.stripe_payment_intent_id, "object": "payment_intent"}},
        }
        with patch(
            "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
            return_value=event,
        ):
            assert client.post("/webhooks/stripe", content=b"{}", headers={"stripe-signature": "v1=a"}).status_code == 200
            assert client.post("/webhooks/stripe", content=b"{}", headers={"stripe-signature": "v1=b"}).status_code == 200
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


def test_webhook_twice_same_pi_keeps_single_payment_row(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A025: webhook idempotente + UNIQUE(stripe_payment_intent_id) — uma linha por PI."""
    db = SessionLocal()
    try:
        pay = _insert_payment_for_webhook(db)
        pi = pay.stripe_payment_intent_id
        assert pi
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        event = {
            "id": "evt_a025_dup_delivery",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": pi, "object": "payment_intent"}},
        }
        with patch(
            "app.api.routers.webhooks.stripe.stripe.Webhook.construct_event",
            return_value=event,
        ):
            assert (
                client.post(
                    "/webhooks/stripe",
                    content=b"{}",
                    headers={"stripe-signature": "v1=a"},
                ).status_code
                == 200
            )
            assert (
                client.post(
                    "/webhooks/stripe",
                    content=b"{}",
                    headers={"stripe-signature": "v1=b"},
                ).status_code
                == 200
            )
        rows = db.execute(
            select(func.count()).select_from(Payment).where(Payment.stripe_payment_intent_id == pi)
        ).scalar()
        assert rows == 1
        db.refresh(pay)
        assert pay.status == PaymentStatus.succeeded
    finally:
        db.close()


# --- 6. Fluxo completo com STRIPE_MOCK — doc §6 (HTTP E2E) ---
def test_complete_trip_with_mock_payment(client: TestClient) -> None:
    assert settings.STRIPE_MOCK is True  # fixture autouse
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        tid = trip_id
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        t = db.execute(select(Trip).where(Trip.id == tid)).scalar_one()
        assert t.distance_km is not None and t.duration_min is not None
        _http_accept_arriving_start_complete(client, db, driver_id, tid)
        assert _get_trip_status_db(db, tid) == "completed"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_complete_trip_full_flow_with_unique_pi_constraint(client: TestClient) -> None:
    """A025: fluxo HTTP accept→complete com STRIPE_MOCK; PI único na BD; não rebenta com UNIQUE."""
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _http_accept_arriving_start_complete(client, db, driver_id, trip_id)
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one()
        assert trip.status == TripStatus.completed
        assert pay.stripe_payment_intent_id
        assert str(pay.stripe_payment_intent_id).startswith("pi_")
        assert trip.final_price is not None
        assert round(float(trip.final_price), 2) == round(float(pay.total_amount), 2)
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- A024 — idempotência complete + alinhamento trip/payment ---
def test_complete_trip_idempotent_second_post(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        driver_id = _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=driver_id, role=Role.driver))
        assert client.post(f"/driver/trips/{trip_id}/accept").status_code == 200
        assert client.post(f"/driver/trips/{trip_id}/arriving").status_code == 200
        assert client.post(f"/driver/trips/{trip_id}/start").status_code == 200
        r1 = client.post(
            f"/driver/trips/{trip_id}/complete",
            json={"final_price": 0.0},
        )
        assert r1.status_code == 200, r1.text
        assert r1.json()["status"] == "completed"
        r2 = client.post(
            f"/driver/trips/{trip_id}/complete",
            json={"final_price": 0.0},
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "completed"
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one()
        assert trip.final_price is not None
        assert round(float(trip.final_price), 2) == round(float(pay.total_amount), 2)
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- 7. Cancelamento — doc §7 ---
def test_cancel_trip(client: TestClient) -> None:
    db = SessionLocal()
    try:
        passenger_id = _create_passenger(db)
        _create_driver_with_location(db, 38.7, -9.1)
        trip_id = _http_create_trip(client, db, passenger_id)
        _override_user_and_db(db, UserContext(user_id=passenger_id, role=Role.passenger))
        r = client.post(f"/trips/{trip_id}/cancel", json={})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "cancelled"
        assert _get_trip_status_db(db, trip_id) == "cancelled"
    finally:
        app.dependency_overrides.clear()
        db.close()
