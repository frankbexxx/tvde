"""Webhook payment_failed closes ongoing trips (STRIPE 3DS fail deadlock fix)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.driving_compliance import (
    active_driving_seconds_in_rolling_24h,
    on_trip_status_change_for_driving_compliance,
)
from app.services.trip_timeouts import run_trip_timeouts
from app.services.trips import (
    complete_trip,
    get_current_active_trip_for_driver,
    get_current_active_trip_for_passenger,
)
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _seed_ongoing_with_payment(
    db: Session,
    *,
    payment_status: PaymentStatus = PaymentStatus.processing,
    trip_status: TripStatus = TripStatus.ongoing,
    with_open_segment: bool = False,
) -> tuple[Trip, Payment, Driver, User]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.add(driver_user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=driver_user.id,
        is_available=False,
        status=DriverStatus.approved,
        commission_percent=15.0,
    )
    db.add(driver)
    db.flush()
    started = datetime.now(timezone.utc) - timedelta(hours=1)
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=trip_status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=4.5,
        distance_km=3.0,
        duration_min=10.0,
        started_at=started if trip_status == TripStatus.ongoing else None,
    )
    db.add(trip)
    db.flush()
    pay = Payment(
        trip_id=trip.id,
        total_amount=4.5,
        commission_amount=0.5,
        driver_amount=4.0,
        currency="EUR",
        status=payment_status,
        stripe_payment_intent_id=f"pi_failongo_{uuid.uuid4().hex}",
    )
    db.add(pay)
    db.commit()
    db.refresh(trip)
    db.refresh(pay)
    db.refresh(driver)
    if with_open_segment and trip_status == TripStatus.ongoing:
        on_trip_status_change_for_driving_compliance(
            db,
            trip,
            TripStatus.accepted,
            TripStatus.arriving,
            at=started - timedelta(minutes=5),
        )
        on_trip_status_change_for_driving_compliance(
            db,
            trip,
            TripStatus.arriving,
            TripStatus.ongoing,
            at=started,
        )
        db.commit()
    return trip, pay, driver, passenger


def _payment_failed_event(pay: Payment, *, evt_id: str) -> dict:
    return {
        "id": evt_id,
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


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_webhook_payment_failed_ongoing_closes_trip_segment_and_driver(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, driver, _ = _seed_ongoing_with_payment(
            db, with_open_segment=True
        )
        seg_before = db.execute(
            select(DriverActiveDrivingSegment).where(
                DriverActiveDrivingSegment.trip_id == trip.id,
                DriverActiveDrivingSegment.ended_at.is_(None),
            )
        ).scalar_one_or_none()
        assert seg_before is not None
        ref = datetime.now(timezone.utc)
        secs_before = active_driving_seconds_in_rolling_24h(
            db, driver.user_id, reference_utc=ref
        )
        assert secs_before > 3000

        evt_id = f"evt_failongo_{uuid.uuid4().hex}"
        assert _post_webhook(client, _payment_failed_event(pay, evt_id=evt_id)).status_code == 200

        db.refresh(pay)
        db.refresh(trip)
        db.refresh(driver)
        assert pay.status == PaymentStatus.failed
        assert trip.status == TripStatus.failed
        assert trip.final_price is None
        assert trip.completed_at is None
        assert driver.is_available is True

        seg = db.execute(
            select(DriverActiveDrivingSegment).where(
                DriverActiveDrivingSegment.trip_id == trip.id
            )
        ).scalar_one()
        assert seg.ended_at is not None
        secs_after = active_driving_seconds_in_rolling_24h(
            db, driver.user_id, reference_utc=ref
        )
        assert secs_after <= secs_before
        assert secs_after < 10 * 3600
    finally:
        db.close()


def test_webhook_payment_failed_duplicate_evt_idempotent(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, driver, _ = _seed_ongoing_with_payment(db)
        evt_id = f"evt_failongo_dup_{uuid.uuid4().hex}"
        event = _payment_failed_event(pay, evt_id=evt_id)
        assert _post_webhook(client, event).status_code == 200
        db.refresh(trip)
        db.refresh(driver)
        assert trip.status == TripStatus.failed
        avail_after_first = driver.is_available
        assert _post_webhook(client, event).status_code == 200
        db.refresh(trip)
        db.refresh(driver)
        assert trip.status == TripStatus.failed
        assert driver.is_available == avail_after_first
    finally:
        db.close()


def test_webhook_payment_failed_trip_already_failed_no_op(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, _, _ = _seed_ongoing_with_payment(
            db, trip_status=TripStatus.failed, payment_status=PaymentStatus.failed
        )
        evt_id = f"evt_failongo_noop_{uuid.uuid4().hex}"
        assert (
            _post_webhook(client, _payment_failed_event(pay, evt_id=evt_id)).status_code
            == 200
        )
        db.refresh(trip)
        assert trip.status == TripStatus.failed
    finally:
        db.close()


def test_complete_trip_blocked_after_payment_failed_webhook(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, _, _ = _seed_ongoing_with_payment(db)
        trip.final_price = 4.5
        trip.distance_km = 3.0
        trip.duration_min = 10.0
        db.commit()
        _post_webhook(
            client,
            _payment_failed_event(pay, evt_id=f"evt_failongo_comp_{uuid.uuid4().hex}"),
        )
        db.refresh(trip)
        assert trip.status == TripStatus.failed
        with pytest.raises(HTTPException) as exc:
            complete_trip(
                db=db,
                driver_id=str(trip.driver_id),
                trip_id=str(trip.id),
            )
        assert exc.value.status_code == 409
    finally:
        db.close()


def test_webhook_payment_failed_completed_trip_unchanged(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, _, _ = _seed_ongoing_with_payment(db)
        trip.status = TripStatus.completed
        trip.final_price = 4.5
        trip.completed_at = datetime.now(timezone.utc)
        db.commit()
        _post_webhook(
            client,
            _payment_failed_event(pay, evt_id=f"evt_failongo_comp2_{uuid.uuid4().hex}"),
        )
        db.refresh(trip)
        db.refresh(pay)
        assert pay.status == PaymentStatus.failed
        assert trip.status == TripStatus.completed
    finally:
        db.close()


def test_active_trips_null_after_payment_failed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
        trip, pay, _, passenger = _seed_ongoing_with_payment(db)
        _post_webhook(
            client,
            _payment_failed_event(pay, evt_id=f"evt_failongo_act_{uuid.uuid4().hex}"),
        )
        db.refresh(trip)
        assert get_current_active_trip_for_passenger(
            db=db, passenger_id=str(passenger.id)
        ) is None
        assert get_current_active_trip_for_driver(
            db=db, driver_id=str(trip.driver_id)
        ) is None

        async def _passenger() -> UserContext:
            return UserContext(user_id=str(passenger.id), role=Role.passenger)

        async def _driver() -> UserContext:
            return UserContext(user_id=str(trip.driver_id), role=Role.driver)

        def _db_dep():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_current_user] = _passenger
        app.dependency_overrides[get_db] = _db_dep
        assert client.get("/trips/active").json() is None

        app.dependency_overrides[get_current_user] = _driver
        assert client.get("/driver/trips/active").json() is None
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_timeout_ongoing_to_failed_regression_unchanged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    try:
        monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
        trip, pay, driver, _ = _seed_ongoing_with_payment(db)
        old_start = datetime.now(timezone.utc) - timedelta(hours=7)
        trip.started_at = old_start
        db.commit()
        run_trip_timeouts(db)
        db.refresh(trip)
        db.refresh(pay)
        db.refresh(driver)
        assert trip.status == TripStatus.failed
        assert pay.status == PaymentStatus.failed
        assert driver.is_available is True
    finally:
        db.close()
