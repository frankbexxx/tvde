"""Reconciliação admin: preview + stripe-sync + close-no-pi (super_admin)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus


@pytest.fixture
def super_admin_ctx() -> None:
    async def _sa() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _sa
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_only_ctx() -> None:
    async def _a() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _a
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.mark.usefixtures("super_admin_ctx")
def test_reconcile_preview_ok(client: TestClient) -> None:
    r = client.get("/admin/ops/reconcile-payments/preview?limit=5")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "candidates" in data
    assert "select_sql" in data
    assert "SELECT" in data["select_sql"].upper()
    assert "count" in data


@pytest.mark.usefixtures("admin_only_ctx")
def test_reconcile_preview_forbidden_for_admin(client: TestClient) -> None:
    r = client.get("/admin/ops/reconcile-payments/preview")
    assert r.status_code == 403


@pytest.mark.usefixtures("super_admin_ctx")
def test_close_no_pi_dry_run(client: TestClient) -> None:
    db = SessionLocal()
    try:
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
            status=TripStatus.completed,
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
                total_amount=10.0,
                commission_amount=1.5,
                driver_amount=8.5,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=None,
            )
        )
        db.commit()
        tid = trip.id
    finally:
        db.close()

    r = client.post(
        "/admin/ops/reconcile-payments/close-no-pi",
        json={
            "governance_reason": "reconciliação teste dry-run sem stripe pi",
            "dry_run": True,
            "limit": 20,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True
    assert body["count"] >= 1
    db2 = SessionLocal()
    try:
        t2 = db2.execute(select(Trip).where(Trip.id == tid)).scalar_one()
        assert t2.status == TripStatus.completed
    finally:
        db2.close()


@pytest.mark.usefixtures("super_admin_ctx")
def test_stripe_sync_dry_run_updates_when_succeeded(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = SessionLocal()
    try:
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
            status=TripStatus.completed,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
        )
        db.add(trip)
        db.flush()
        pi = f"pi_test_{uuid.uuid4().hex[:16]}"
        pay = Payment(
            trip_id=trip.id,
            total_amount=10.0,
            commission_amount=1.5,
            driver_amount=8.5,
            currency="EUR",
            status=PaymentStatus.processing,
            stripe_payment_intent_id=pi,
        )
        db.add(pay)
        db.flush()
        pay.updated_at = pay.updated_at - timedelta(days=400)
        db.commit()
        pid = pay.id
    finally:
        db.close()

    def fake_retrieve(_pi: str) -> MagicMock:
        m = MagicMock()
        m.status = "succeeded"
        return m

    monkeypatch.setattr(
        "app.services.admin_payment_reconciliation.retrieve_payment_intent",
        fake_retrieve,
    )

    r = client.post(
        "/admin/ops/reconcile-payments/stripe-sync",
        json={
            "governance_reason": "reconciliação teste dry-run stripe succeeded",
            "dry_run": False,
            "limit": 50,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert any(
        it.get("payment_id") == str(pid) and it.get("action") == "updated_succeeded"
        for it in body.get("items", [])
    )
    db3 = SessionLocal()
    try:
        p3 = db3.execute(select(Payment).where(Payment.id == pid)).scalar_one()
        assert p3.status == PaymentStatus.succeeded
    finally:
        db3.close()
