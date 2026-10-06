"""Passenger wallet: Customer, SetupIntent, PM gate, accept with prepared PM."""

from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.passenger_payment_method import PassengerPaymentMethod
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services import passenger_payments as wallet
from app.services import trips as trip_service
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _delete_trip(db: Session, trip_id: uuid.UUID | None) -> None:
    """Remove a trip left by wallet create_trip tests (no persisted offers)."""
    if trip_id is None:
        return
    trip = db.get(Trip, trip_id)
    if trip is None:
        return
    db.delete(trip)
    db.commit()


def _passenger(db: Session) -> User:
    u = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_ensure_customer_creates_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        assert u.stripe_customer_id is None
        cus = wallet.ensure_stripe_customer(db, u)
        assert cus.startswith("cus_mock_")
        db.refresh(u)
        assert u.stripe_customer_id == cus
    finally:
        db.close()


def test_ensure_customer_reuses_existing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        first = wallet.ensure_stripe_customer(db, u)
        second = wallet.ensure_stripe_customer(db, u)
        assert first == second
    finally:
        db.close()


def test_ensure_customer_retries_do_not_duplicate(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        a = wallet.ensure_stripe_customer(db, u)
        b = wallet.ensure_stripe_customer(db, u)
        c = wallet.ensure_stripe_customer(db, u)
        assert a == b == c
        db.refresh(u)
        assert u.stripe_customer_id == a
    finally:
        db.close()


def test_ensure_customer_live_idempotent_reuse_no_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """STRIPE_MOCK=false: create once with idempotency key; retries reuse same Customer."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        fake_cus = SimpleNamespace(id=f"cus_live_{uuid.uuid4().hex[:12]}")
        with patch(
            "app.services.passenger_payments.create_customer",
            return_value=fake_cus,
        ) as create_cus:
            first = wallet.ensure_stripe_customer(db, u)
            second = wallet.ensure_stripe_customer(db, u)
            third = wallet.ensure_stripe_customer(db, u)
        assert first == second == third == fake_cus.id
        assert create_cus.call_count == 1
        kwargs = create_cus.call_args.kwargs
        assert kwargs.get("idempotency_key") == f"tvde-cus-{u.id}"
        assert kwargs.get("metadata", {}).get("user_id") == str(u.id)
        db.refresh(u)
        assert u.stripe_customer_id == fake_cus.id
    finally:
        db.close()


def test_live_default_reconciles_from_stripe_customer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Stripe invoice default wins over stale DB is_default."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        cus_id = f"cus_rec_{uuid.uuid4().hex[:12]}"
        pm_stale = f"pm_stale_{uuid.uuid4().hex[:10]}"
        pm_auth = f"pm_auth_{uuid.uuid4().hex[:10]}"
        u.stripe_customer_id = cus_id
        db.add(u)
        db.flush()
        stale = PassengerPaymentMethod(
            user_id=u.id,
            stripe_payment_method_id=pm_stale,
            brand="visa",
            last4="1111",
            is_default=True,
        )
        auth = PassengerPaymentMethod(
            user_id=u.id,
            stripe_payment_method_id=pm_auth,
            brand="mastercard",
            last4="4444",
            is_default=False,
        )
        db.add_all([stale, auth])
        db.commit()

        fake_customer = SimpleNamespace(
            id=cus_id,
            invoice_settings=SimpleNamespace(default_payment_method=pm_auth),
        )
        with patch(
            "app.services.passenger_payments.retrieve_customer",
            return_value=fake_customer,
        ):
            default = wallet.get_default_payment_method(db, u)
        assert default is not None
        assert default.stripe_payment_method_id == pm_auth
        db.refresh(stale)
        db.refresh(auth)
        assert stale.is_default is False
        assert auth.is_default is True
    finally:
        db.close()


def test_live_gate_uses_stripe_default_not_stale_db(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        cus_id = f"cus_gate_rec_{uuid.uuid4().hex[:12]}"
        u.stripe_customer_id = cus_id
        db.add(u)
        db.flush()
        db.add(
            PassengerPaymentMethod(
                user_id=u.id,
                stripe_payment_method_id=f"pm_only_db_{uuid.uuid4().hex[:10]}",
                brand="visa",
                last4="4242",
                is_default=True,
            )
        )
        db.commit()
        fake_customer = SimpleNamespace(
            id=cus_id,
            invoice_settings=SimpleNamespace(default_payment_method=None),
        )
        with patch(
            "app.services.passenger_payments.retrieve_customer",
            return_value=fake_customer,
        ):
            with pytest.raises(HTTPException) as ei:
                wallet.assert_passenger_ready_for_trip(db, u)
        assert ei.value.status_code == 402
        assert ei.value.detail == "payment_method_required"
    finally:
        db.close()


def test_setup_intent_for_correct_customer_no_trip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        before = db.query(Trip).count()
        data = wallet.create_passenger_setup_intent(db, u)
        assert data["customer_id"] == u.stripe_customer_id
        assert data["setup_intent_id"].startswith("seti_mock_")
        assert data["client_secret"].endswith("_secret_mock")
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_first_pm_becomes_default_and_list_safe(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        si = wallet.create_passenger_setup_intent(db, u)
        row = wallet.register_payment_method_from_setup_intent(
            db, u, setup_intent_id=si["setup_intent_id"]
        )
        assert row["is_default"] is True
        assert row["last4"] == "4242"
        assert "pan" not in row
        assert "cvc" not in row
        methods = wallet.list_payment_methods(db, u)
        assert len(methods) == 1
        assert methods[0]["is_default"] is True
        assert set(methods[0].keys()) == {
            "id",
            "payment_method_id",
            "brand",
            "last4",
            "exp_month",
            "exp_year",
            "is_default",
        }
    finally:
        db.close()


def test_set_default_and_remove_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        si1 = wallet.create_passenger_setup_intent(db, u)
        a = wallet.register_payment_method_from_setup_intent(
            db, u, setup_intent_id=si1["setup_intent_id"]
        )
        si2 = wallet.create_passenger_setup_intent(db, u)
        b = wallet.register_payment_method_from_setup_intent(
            db, u, setup_intent_id=si2["setup_intent_id"]
        )
        out = wallet.set_default_payment_method(db, u, method_row_id=b["id"])
        assert out["is_default"] is True
        assert out["id"] == b["id"]
        methods = wallet.list_payment_methods(db, u)
        defaults = [m for m in methods if m["is_default"]]
        assert len(defaults) == 1
        assert defaults[0]["id"] == b["id"]
        wallet.detach_passenger_payment_method(db, u, method_row_id=a["id"])
        assert len(wallet.list_payment_methods(db, u)) == 1
    finally:
        db.close()


def test_register_rejects_arbitrary_setup_intent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        with pytest.raises(HTTPException) as ei:
            wallet.register_payment_method_from_setup_intent(
                db, u, setup_intent_id="seti_not_mock_arbitrary"
            )
        assert ei.value.status_code == 400
    finally:
        db.close()


def test_register_live_rejects_wrong_customer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        u.stripe_customer_id = f"cus_mine_{uuid.uuid4().hex[:12]}"
        db.add(u)
        db.commit()

        fake_si = SimpleNamespace(
            status="succeeded",
            customer="cus_other",
            payment_method="pm_x",
        )
        with patch(
            "app.services.passenger_payments.retrieve_setup_intent",
            return_value=fake_si,
        ):
            with pytest.raises(HTTPException) as ei:
                wallet.register_payment_method_from_setup_intent(
                    db, u, setup_intent_id="seti_live_x"
                )
        assert ei.value.status_code == 403
        assert ei.value.detail == "setup_intent_customer_mismatch"
    finally:
        db.close()


def test_set_default_live_syncs_stripe_before_db(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        u.stripe_customer_id = f"cus_live_{uuid.uuid4().hex[:12]}"
        db.add(u)
        db.flush()
        pm1 = f"pm_live_1_{uuid.uuid4().hex[:10]}"
        pm2 = f"pm_live_2_{uuid.uuid4().hex[:10]}"
        row = PassengerPaymentMethod(
            user_id=u.id,
            stripe_payment_method_id=pm1,
            brand="visa",
            last4="4242",
            is_default=False,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        with patch(
            "app.services.passenger_payments.set_customer_default_payment_method"
        ) as set_def:
            set_def.return_value = SimpleNamespace(id=u.stripe_customer_id)
            out = wallet.set_default_payment_method(db, u, method_row_id=str(row.id))
        set_def.assert_called_once_with(u.stripe_customer_id, pm1)
        assert out["is_default"] is True

        with patch(
            "app.services.passenger_payments.set_customer_default_payment_method",
            side_effect=RuntimeError("stripe down"),
        ):
            row2 = PassengerPaymentMethod(
                user_id=u.id,
                stripe_payment_method_id=pm2,
                brand="mastercard",
                last4="4444",
                is_default=False,
            )
            db.add(row2)
            db.commit()
            db.refresh(row2)
            with pytest.raises(HTTPException) as ei:
                wallet.set_default_payment_method(db, u, method_row_id=str(row2.id))
            assert ei.value.detail == "stripe_set_default_failed"
            db.refresh(row2)
            assert row2.is_default is False
    finally:
        db.close()


def test_detach_blocked_when_pm_on_active_trip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        si = wallet.create_passenger_setup_intent(db, u)
        pm = wallet.register_payment_method_from_setup_intent(
            db, u, setup_intent_id=si["setup_intent_id"]
        )
        trip = Trip(
            passenger_id=u.id,
            status=TripStatus.accepted,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.71,
            destination_lng=-9.12,
            estimated_price=10.0,
        )
        db.add(trip)
        db.flush()
        db.add(
            Payment(
                trip_id=trip.id,
                total_amount=0.5,
                commission_amount=0.1,
                driver_amount=0.4,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:12]}",
                stripe_payment_method_id=pm["payment_method_id"],
            )
        )
        db.commit()
        with pytest.raises(HTTPException) as ei:
            wallet.detach_passenger_payment_method(db, u, method_row_id=pm["id"])
        assert ei.value.status_code == 409
        assert ei.value.detail == "payment_method_in_use"
    finally:
        db.close()


def test_create_trip_gate_without_pm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    db = _db()
    try:
        u = _passenger(db)
        before = db.query(Trip).count()
        payload = TripCreateRequest(
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.72,
            destination_lng=-9.14,
            vehicle_category="x",
        )
        with pytest.raises(HTTPException) as ei:
            asyncio.run(
                trip_service.create_trip(
                    db=db, passenger_id=str(u.id), payload=payload
                )
            )
        assert ei.value.status_code == 402
        assert ei.value.detail == "payment_method_required"
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_create_trip_ok_with_default_pm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(
        "app.services.osrm.get_route_distance_duration",
        lambda *a, **k: (10.0, 15.0),
        raising=False,
    )
    monkeypatch.setattr(trip_service, "create_offers_for_trip", lambda **k: [object()])
    monkeypatch.setattr(trip_service, "publish_trip_offers", lambda **k: None)
    db = _db()
    trip_id: uuid.UUID | None = None
    try:
        u = _passenger(db)
        cus_id = f"cus_gate_{uuid.uuid4().hex[:12]}"
        pm_id = f"pm_gate_{uuid.uuid4().hex[:10]}"
        u.stripe_customer_id = cus_id
        db.add(u)
        db.flush()
        db.add(
            PassengerPaymentMethod(
                user_id=u.id,
                stripe_payment_method_id=pm_id,
                brand="visa",
                last4="4242",
                is_default=True,
            )
        )
        db.commit()
        payload = TripCreateRequest(
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.72,
            destination_lng=-9.14,
            vehicle_category="x",
        )
        fake_customer = SimpleNamespace(
            id=cus_id,
            invoice_settings=SimpleNamespace(default_payment_method=pm_id),
        )
        with patch(
            "app.services.passenger_payments.retrieve_customer",
            return_value=fake_customer,
        ):
            trip, _ = asyncio.run(
                trip_service.create_trip(
                    db=db, passenger_id=str(u.id), payload=payload
                )
            )
        trip_id = trip.id
        assert trip.id is not None
        assert trip.status == TripStatus.requested
    finally:
        _delete_trip(db, trip_id)
        db.close()


def test_create_trip_mock_without_pm_still_works(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(
        "app.services.osrm.get_route_distance_duration",
        lambda *a, **k: (10.0, 15.0),
        raising=False,
    )
    monkeypatch.setattr(trip_service, "create_offers_for_trip", lambda **k: [object()])
    monkeypatch.setattr(trip_service, "publish_trip_offers", lambda **k: None)
    db = _db()
    trip_id: uuid.UUID | None = None
    try:
        u = _passenger(db)
        payload = TripCreateRequest(
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.72,
            destination_lng=-9.14,
            vehicle_category="x",
        )
        trip, _ = asyncio.run(
            trip_service.create_trip(
                db=db, passenger_id=str(u.id), payload=payload
            )
        )
        trip_id = trip.id
        assert trip.status == TripStatus.requested
    finally:
        _delete_trip(db, trip_id)
        db.close()


def test_accept_uses_customer_and_default_pm(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    for name in (
        "assert_driver_can_accept_by_driving_hours",
        "assert_driver_vehicle_operational_for_new_ops",
        "assert_driver_vehicle_compliance_for_accept",
        "assert_driver_required_documents_for_new_ops",
        "_assert_driver_matches_trip_for_accept",
    ):
        monkeypatch.setattr(trip_service, name, lambda *a, **k: None)

    db = _db()
    try:
        passenger = _passenger(db)
        passenger.stripe_customer_id = f"cus_accept_{uuid.uuid4().hex[:12]}"
        db.add(passenger)
        db.flush()
        pm_accept = f"pm_accept_{uuid.uuid4().hex[:10]}"
        db.add(
            PassengerPaymentMethod(
                user_id=passenger.id,
                stripe_payment_method_id=pm_accept,
                brand="visa",
                last4="4242",
                is_default=True,
            )
        )
        driver_user = User(
            role=Role.driver,
            name=f"D {uuid.uuid4()}",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        db.add(driver_user)
        db.flush()
        driver = Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_user.id,
            status=DriverStatus.approved,
            documents=None,
            is_available=True,
            commission_percent=15.0,
        )
        db.add(driver)
        db.flush()
        trip = Trip(
            passenger_id=passenger.id,
            status=TripStatus.assigned,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.72,
            destination_lng=-9.14,
            estimated_price=12.0,
        )
        db.add(trip)
        db.commit()

        fake_pi = SimpleNamespace(
            id=f"pi_live_accept_{uuid.uuid4().hex[:12]}",
            client_secret="sec",
        )
        fake_customer = SimpleNamespace(
            id=passenger.stripe_customer_id,
            invoice_settings=SimpleNamespace(default_payment_method=pm_accept),
        )
        with patch(
            "app.services.passenger_payments.retrieve_customer",
            return_value=fake_customer,
        ):
            with patch(
                "app.services.trips.create_authorization_payment_intent",
                return_value=fake_pi,
            ) as create_pi:
                out, _secret = trip_service.accept_trip(
                    db=db,
                    driver_id=str(driver_user.id),
                    trip_id=str(trip.id),
                )
        kwargs = create_pi.call_args.kwargs
        assert kwargs.get("customer") == passenger.stripe_customer_id
        assert kwargs.get("payment_method") == pm_accept
        pay = db.query(Payment).filter(Payment.trip_id == out.id).one()
        assert pay.stripe_payment_method_id == pm_accept
    finally:
        db.close()
