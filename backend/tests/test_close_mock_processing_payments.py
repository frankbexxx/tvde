"""PAYMENTS-STUCK-1B: close-mock-processing dry-run / apply / scope / idempotência."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.admin_payment_reconciliation import close_mock_processing_payments


@pytest.fixture
def super_admin_ctx() -> None:
    async def _sa() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _sa
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _seed_pair(
    db: Session,
    *,
    trip_status: TripStatus,
    payment_status: PaymentStatus,
    pi_id: str | None,
) -> tuple[str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10**8:08d}",
        status=UserStatus.active,
    )
    driver_u = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10**8:08d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.add(driver_u)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_u.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_u.id,
        status=trip_status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        final_price=10.0 if trip_status == TripStatus.completed else None,
    )
    db.add(trip)
    db.flush()
    pay = Payment(
        trip_id=trip.id,
        total_amount=10.0 if trip_status == TripStatus.completed else 0.5,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=payment_status,
        stripe_payment_intent_id=pi_id,
    )
    db.add(pay)
    db.commit()
    return str(trip.id), str(pay.id)


def _seed_trip_no_payment(db: Session) -> str:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10**8:08d}",
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
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    return str(trip.id)


def test_service_dry_run_completed_mock_no_write() -> None:
    db = SessionLocal()
    try:
        tid, pid = _seed_pair(
            db,
            trip_status=TripStatus.completed,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
        out = close_mock_processing_payments(
            db,
            actor_user_id=str(uuid.uuid4()),
            governance_reason="teste dry-run completed mock",
            dry_run=True,
            limit=500,
        )
        assert out["dry_run"] is True
        assert out["to_succeeded"] >= 1
        assert any(i["payment_id"] == pid for i in out["items"])
        pay = db.execute(select(Payment).where(Payment.id == pid)).scalar_one()
        trip = db.execute(select(Trip).where(Trip.id == tid)).scalar_one()
        assert pay.status == PaymentStatus.processing
        assert trip.status == TripStatus.completed
    finally:
        db.close()


def test_service_dry_run_cancelled_mock_no_write() -> None:
    db = SessionLocal()
    try:
        tid, pid = _seed_pair(
            db,
            trip_status=TripStatus.cancelled,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
        out = close_mock_processing_payments(
            db,
            actor_user_id=str(uuid.uuid4()),
            governance_reason="teste dry-run cancelled mock",
            dry_run=True,
            limit=500,
        )
        assert out["to_failed"] >= 1
        assert any(i["payment_id"] == pid for i in out["items"])
        pay = db.execute(select(Payment).where(Payment.id == pid)).scalar_one()
        trip = db.execute(select(Trip).where(Trip.id == tid)).scalar_one()
        assert pay.status == PaymentStatus.processing
        assert trip.status == TripStatus.cancelled
    finally:
        db.close()


def test_service_apply_completed_and_cancelled_and_idempotent() -> None:
    db = SessionLocal()
    try:
        tid_c, pid_c = _seed_pair(
            db,
            trip_status=TripStatus.completed,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
        tid_x, pid_x = _seed_pair(
            db,
            trip_status=TripStatus.cancelled,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
        actor = str(uuid.uuid4())
        out = close_mock_processing_payments(
            db,
            actor_user_id=actor,
            governance_reason="teste apply close mock processing",
            dry_run=False,
            limit=500,
        )
        assert out["dry_run"] is False
        assert out["to_succeeded"] >= 1
        assert out["to_failed"] >= 1

        pay_c = db.execute(select(Payment).where(Payment.id == pid_c)).scalar_one()
        trip_c = db.execute(select(Trip).where(Trip.id == tid_c)).scalar_one()
        assert pay_c.status == PaymentStatus.succeeded
        assert trip_c.status == TripStatus.completed

        pay_x = db.execute(select(Payment).where(Payment.id == pid_x)).scalar_one()
        trip_x = db.execute(select(Trip).where(Trip.id == tid_x)).scalar_one()
        assert pay_x.status == PaymentStatus.failed
        assert trip_x.status == TripStatus.cancelled

        out2 = close_mock_processing_payments(
            db,
            actor_user_id=actor,
            governance_reason="teste apply idempotente close mock",
            dry_run=False,
            limit=500,
        )
        assert out2["count"] == 0
        assert out2["to_succeeded"] == 0
        assert out2["to_failed"] == 0
    finally:
        db.close()


def test_service_skips_real_pi_succeeded_and_no_payment() -> None:
    db = SessionLocal()
    try:
        tid_real, pid_real = _seed_pair(
            db,
            trip_status=TripStatus.cancelled,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_real_{uuid.uuid4().hex[:20]}",
        )
        tid_ok, pid_ok = _seed_pair(
            db,
            trip_status=TripStatus.completed,
            payment_status=PaymentStatus.succeeded,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
        tid_bare = _seed_trip_no_payment(db)

        out = close_mock_processing_payments(
            db,
            actor_user_id=str(uuid.uuid4()),
            governance_reason="teste scope close mock processing",
            dry_run=False,
            limit=500,
        )
        assert not any(i["payment_id"] == pid_real for i in out["items"])
        assert not any(i["payment_id"] == pid_ok for i in out["items"])
        assert not any(i["trip_id"] == tid_bare for i in out["items"])

        pay_real = db.execute(select(Payment).where(Payment.id == pid_real)).scalar_one()
        pay_ok = db.execute(select(Payment).where(Payment.id == pid_ok)).scalar_one()
        trip_bare = db.execute(select(Trip).where(Trip.id == tid_bare)).scalar_one()
        assert pay_real.status == PaymentStatus.processing
        assert pay_ok.status == PaymentStatus.succeeded
        assert trip_bare.status == TripStatus.completed
        assert tid_real  # kept for clarity / lint
    finally:
        db.close()


@pytest.mark.usefixtures("super_admin_ctx")
def test_http_preview_and_dry_run_and_apply(client: TestClient) -> None:
    db = SessionLocal()
    try:
        tid, pid = _seed_pair(
            db,
            trip_status=TripStatus.completed,
            payment_status=PaymentStatus.processing,
            pi_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
        )
    finally:
        db.close()

    r_prev = client.get(
        "/admin/ops/reconcile-payments/close-mock-processing/preview?limit=200"
    )
    assert r_prev.status_code == 200, r_prev.text
    prev = r_prev.json()
    assert prev["dry_run"] is True
    assert "to_succeeded" in prev
    assert "to_failed" in prev
    assert any(i["payment_id"] == pid for i in prev["items"])

    r_dry = client.post(
        "/admin/ops/reconcile-payments/close-mock-processing",
        json={
            "governance_reason": "PAYMENTS-STUCK-1B dry-run http teste",
            "dry_run": True,
            "limit": 200,
        },
    )
    assert r_dry.status_code == 200, r_dry.text
    dry = r_dry.json()
    assert dry["dry_run"] is True
    db2 = SessionLocal()
    try:
        assert (
            db2.execute(select(Payment).where(Payment.id == pid)).scalar_one().status
            == PaymentStatus.processing
        )
    finally:
        db2.close()

    r_apply = client.post(
        "/admin/ops/reconcile-payments/close-mock-processing",
        json={
            "governance_reason": "PAYMENTS-STUCK-1B apply http teste",
            "dry_run": False,
            "limit": 200,
        },
    )
    assert r_apply.status_code == 200, r_apply.text
    applied = r_apply.json()
    assert applied["dry_run"] is False
    assert applied["to_succeeded"] >= 1
    db3 = SessionLocal()
    try:
        pay = db3.execute(select(Payment).where(Payment.id == pid)).scalar_one()
        trip = db3.execute(select(Trip).where(Trip.id == tid)).scalar_one()
        assert pay.status == PaymentStatus.succeeded
        assert trip.status == TripStatus.completed
    finally:
        db3.close()
