"""Passenger GET exposes Stripe PI status; driver complete does not leak client_secret."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _ongoing_trip_with_payment(
    db: Session, *, pi_id: str | None = None
) -> tuple[str, str, str]:
    if pi_id is None:
        pi_id = f"pi_test_{uuid.uuid4().hex}"
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, driver_user])
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=driver_user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=15.0,
        is_available=False,
    )
    db.add(driver)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.ongoing,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.72,
        destination_lng=-9.14,
        estimated_price=12.0,
        distance_km=3.0,
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        stripe_payment_intent_id=pi_id,
        total_amount=0.5,
        currency="EUR",
        status=PaymentStatus.processing,
        commission_amount=0.0,
        driver_amount=0.0,
        driver_payout=0.0,
    )
    db.add(payment)
    db.commit()
    return str(passenger.id), str(driver_user.id), str(trip.id)


def _override(db: Session, user_ctx: UserContext) -> None:
    async def override_get_current_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db


def _reset() -> None:
    app.dependency_overrides.clear()


def test_passenger_get_includes_payment_intent_status_requires_action(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        passenger_id, _driver_id, trip_id = _ongoing_trip_with_payment(db)
        pi = SimpleNamespace(
            status="requires_action",
            client_secret="pi_test_secret_do_not_log",
        )
        with patch(
            "app.api.serializers.trip.retrieve_payment_intent",
            return_value=pi,
        ) as retrieve:
            _override(
                db, UserContext(user_id=passenger_id, role=Role.passenger)
            )
            client = TestClient(app)
            r = client.get(f"/trips/{trip_id}")
            assert r.status_code == 200
            body = r.json()
            assert body["payment_intent_status"] == "requires_action"
            assert body["payment_intent_client_secret"] == "pi_test_secret_do_not_log"
            retrieve.assert_called_once()
    finally:
        _reset()
        db.close()


def test_driver_complete_response_has_no_client_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", False, raising=False)
    db = _db()
    try:
        _passenger_id, driver_id, trip_id = _ongoing_trip_with_payment(db)
        intent_pm = SimpleNamespace(
            status="requires_confirmation",
            payment_method="pm_card",
            amount=50,
            currency="eur",
        )
        confirmed = SimpleNamespace(status="requires_action")
        with (
            patch(
                "app.services.trips.retrieve_payment_intent",
                return_value=intent_pm,
            ),
            patch(
                "app.services.trips.update_payment_intent_amount",
                return_value=intent_pm,
            ),
            patch(
                "app.services.trips.confirm_payment_intent",
                return_value=confirmed,
            ),
            patch("app.services.trips.capture_payment_intent") as capture,
        ):
            _override(db, UserContext(user_id=driver_id, role=Role.driver))
            client = TestClient(app)
            r = client.post(
                f"/driver/trips/{trip_id}/complete",
                json={"final_price": 0.0},
            )
            assert r.status_code == 409
            assert r.json()["detail"] == "payment_requires_action"
            assert "payment_intent_client_secret" not in r.json()
            assert "client_secret" not in r.text
            capture.assert_not_called()
    finally:
        _reset()
        db.close()
