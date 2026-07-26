"""Race: unlocked admin cancel must not rewrite completed→cancelled after settlement."""

from __future__ import annotations

import queue
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import event, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import (
    DriverStatus,
    PaymentStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services import trips


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _seed_ongoing_trip_with_payment() -> tuple[uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        passenger = User(
            role=Role.passenger,
            name="Admin Cancel Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Admin Cancel Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([passenger, driver_user])
        db.flush()
        db.add(
            Driver(
                partner_id=DEFAULT_PARTNER_UUID,
                user_id=driver_user.id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=False,
            )
        )
        trip = Trip(
            passenger_id=passenger.id,
            driver_id=driver_user.id,
            status=TripStatus.ongoing,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            distance_km=3.0,
            duration_min=12.0,
            vehicle_category="x",
            started_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            updated_at=datetime.now(timezone.utc) - timedelta(minutes=5),
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
                stripe_payment_intent_id=f"pi_mock_admin_cancel_race_{uuid.uuid4().hex[:12]}",
            )
        )
        db.commit()
        return driver_user.id, trip.id
    finally:
        db.close()


def test_admin_cancel_cannot_overwrite_concurrent_complete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Admin cancel must wait on trip FOR UPDATE and 409 after complete commits."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id = _seed_ongoing_trip_with_payment()

    trip_locked = threading.Event()
    release_complete = threading.Event()
    admin_statement_started = threading.Event()
    admin_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()
    original_lock = trips._get_trip_for_driver_locked

    def pause_after_trip_lock(*, db, driver_id, trip_id):
        trip = original_lock(db=db, driver_id=driver_id, trip_id=trip_id)
        trip_locked.set()
        if not release_complete.wait(timeout=5):
            raise TimeoutError("test did not release complete_trip")
        return trip

    monkeypatch.setattr(trips, "_get_trip_for_driver_locked", pause_after_trip_lock)

    def run_complete() -> None:
        thread_db = SessionLocal()
        try:
            trips.complete_trip(
                db=thread_db,
                driver_id=str(driver_id),
                trip_id=str(trip_id),
            )
            outcomes.put(("complete", "ok"))
        except BaseException as exc:
            outcomes.put(("complete_error", exc))
        finally:
            thread_db.close()

    def run_admin_cancel() -> None:
        connection = engine.connect()

        def note_first_statement(*_args, **_kwargs) -> None:
            admin_statement_started.set()

        event.listen(
            connection, "before_cursor_execute", note_first_statement, once=True
        )
        thread_db = Session(bind=connection)
        try:
            trips.cancel_trip_by_admin(
                db=thread_db,
                trip_id=str(trip_id),
                cancellation_reason="stale admin cancel race",
            )
            outcomes.put(("admin_cancel", "ok"))
        except HTTPException as exc:
            outcomes.put(("admin_cancel_status", exc.status_code))
        except BaseException as exc:
            outcomes.put(("admin_cancel_error", exc))
        finally:
            thread_db.close()
            connection.close()
            admin_done.set()

    complete_thread = threading.Thread(target=run_complete)
    admin_thread = threading.Thread(target=run_admin_cancel)
    complete_thread.start()
    assert trip_locked.wait(timeout=5)
    admin_thread.start()
    assert admin_statement_started.wait(timeout=5)
    time.sleep(0.1)
    try:
        assert not admin_done.is_set()
    finally:
        release_complete.set()

    complete_thread.join(timeout=5)
    admin_thread.join(timeout=5)
    assert not complete_thread.is_alive()
    assert not admin_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "complete": "ok",
        "admin_cancel_status": 409,
    }

    verify_db = SessionLocal()
    try:
        trip = verify_db.get(Trip, trip_id)
        payment = verify_db.execute(
            text("SELECT status FROM payments WHERE trip_id = :tid"),
            {"tid": str(trip_id)},
        ).one()
        assert trip is not None
        assert trip.status == TripStatus.completed
        assert payment[0] == PaymentStatus.succeeded.value
    finally:
        verify_db.close()


def test_admin_cancel_still_cancels_accepted_trip() -> None:
    db = SessionLocal()
    try:
        passenger = User(
            role=Role.passenger,
            name="Admin Cancel Happy Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Admin Cancel Happy Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([passenger, driver_user])
        db.flush()
        db.add(
            Driver(
                partner_id=DEFAULT_PARTNER_UUID,
                user_id=driver_user.id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=False,
            )
        )
        trip = Trip(
            passenger_id=passenger.id,
            driver_id=driver_user.id,
            status=TripStatus.accepted,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
        )
        db.add(trip)
        db.commit()
        trip_id = trip.id
        driver_id = driver_user.id
    finally:
        db.close()

    db = SessionLocal()
    try:
        cancelled = trips.cancel_trip_by_admin(
            db=db,
            trip_id=str(trip_id),
            cancellation_reason="ops cancel",
        )
        driver = db.get(Driver, driver_id)
        assert cancelled.status == TripStatus.cancelled
        assert cancelled.cancelled_by == "admin"
        assert driver is not None and driver.is_available is True
    finally:
        db.close()
