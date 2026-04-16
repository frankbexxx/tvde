"""SP-A: admin operacional (unblock, transição de viagem, cancel com motivo, nota pagamento)."""

from __future__ import annotations

import uuid

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
def admin_ctx() -> None:
    async def _admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.usefixtures("admin_ctx")
def test_unblock_user_beta(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    phone = f"+3519{uuid.uuid4().int % 10**8:08d}"
    uid = uuid.uuid4()
    db = SessionLocal()
    try:
        u = User(
            id=uid,
            role=Role.passenger,
            name="Blocked",
            phone=phone,
            status=UserStatus.blocked,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    r = client.post(f"/admin/users/{uid}/unblock")
    assert r.status_code == 200, r.text
    db2 = SessionLocal()
    try:
        u2 = db2.execute(select(User).where(User.id == uid)).scalar_one()
        assert u2.status == UserStatus.active
    finally:
        db2.close()


@pytest.mark.usefixtures("admin_ctx")
def test_admin_trip_transition_accepted_to_arriving(client: TestClient) -> None:
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
                total_amount=10.0,
                commission_amount=1.5,
                driver_amount=8.5,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=f"pi_test_{uuid.uuid4().hex[:20]}",
            )
        )
        db.commit()
        trip_id = str(trip.id)
    finally:
        db.close()

    r = client.post(
        f"/admin/trips/{trip_id}/transition",
        json={
            "to_status": "arriving",
            "confirmation": "FORCAR_ARRIVING",
            "reason": "motorista confirmou deslocação",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "arriving"


@pytest.mark.usefixtures("admin_ctx")
def test_admin_cancel_trip_optional_body_reason(client: TestClient) -> None:
    db = SessionLocal()
    try:
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
            status=TripStatus.requested,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=5.0,
        )
        db.add(trip)
        db.commit()
        trip_id = str(trip.id)
    finally:
        db.close()

    reason = "incidente operacional " * 2
    r = client.post(
        f"/admin/cancel-trip/{trip_id}",
        json={"confirmation": "CANCELAR_VIAGEM", "reason": reason},
    )
    assert r.status_code == 200, r.text
    db2 = SessionLocal()
    try:
        t2 = db2.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        assert t2.status == TripStatus.cancelled
        assert t2.cancellation_reason == reason.strip()[:280]
    finally:
        db2.close()


@pytest.mark.usefixtures("admin_ctx")
def test_admin_payment_ops_note(client: TestClient) -> None:
    db = SessionLocal()
    try:
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
            status=TripStatus.accepted,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
        )
        db.add(trip)
        db.flush()
        pay = Payment(
            trip_id=trip.id,
            total_amount=10.0,
            commission_amount=1.5,
            driver_amount=8.5,
            currency="EUR",
            status=PaymentStatus.processing,
            stripe_payment_intent_id=f"pi_test_{uuid.uuid4().hex[:20]}",
        )
        db.add(pay)
        db.commit()
        trip_id = str(trip.id)
        pay_id = str(pay.id)
    finally:
        db.close()

    r = client.post(
        f"/admin/trips/{trip_id}/payment-ops-note",
        json={"confirmation": "REGISTAR_NOTA_PAGAMENTO", "note": "Cliente contactado"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("payment_id") == pay_id
