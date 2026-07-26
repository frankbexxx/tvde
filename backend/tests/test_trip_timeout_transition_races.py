"""Races: accepted/ongoing timeouts must not clobber live trip transitions."""

from __future__ import annotations

import queue
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
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
from app.services import trip_timeouts, trips


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _isolate_timeout_cutoffs(monkeypatch: pytest.MonkeyPatch) -> None:
    ten_years_in_minutes = 10 * 365 * 24 * 60
    monkeypatch.setattr(
        trip_timeouts,
        "ASSIGNED_TIMEOUT_MINUTES",
        ten_years_in_minutes,
    )
    monkeypatch.setattr(
        trip_timeouts,
        "ACCEPTED_TIMEOUT_MINUTES",
        ten_years_in_minutes,
    )
    monkeypatch.setattr(
        trip_timeouts,
        "ONGOING_TIMEOUT_HOURS",
        10 * 365 * 24,
    )


def _seed_stale_accepted_trip() -> tuple[uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        passenger = User(
            role=Role.passenger,
            name="Timeout Arriving Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Timeout Arriving Race Driver",
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
            updated_at=datetime.now(timezone.utc) - timedelta(days=365 * 20),
        )
        db.add(trip)
        db.commit()
        return driver_user.id, trip.id
    finally:
        db.close()


def _seed_stale_ongoing_trip() -> tuple[uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        passenger = User(
            role=Role.passenger,
            name="Timeout Complete Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Timeout Complete Race Driver",
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
            started_at=datetime.now(timezone.utc) - timedelta(days=365 * 20),
            updated_at=datetime.now(timezone.utc) - timedelta(days=365 * 20),
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
                stripe_payment_intent_id=f"pi_mock_timeout_race_{uuid.uuid4().hex[:12]}",
            )
        )
        db.commit()
        return driver_user.id, trip.id
    finally:
        db.close()


def test_accepted_timeout_cannot_overwrite_concurrent_arriving(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Timeout must wait on trip FOR UPDATE and no-op after accepted→arriving."""
    _isolate_timeout_cutoffs(monkeypatch)
    driver_id, trip_id = _seed_stale_accepted_trip()

    trip_locked = threading.Event()
    release_arriving = threading.Event()
    timeout_statement_started = threading.Event()
    timeout_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()
    original_lock = trips._get_trip_for_driver_locked

    def pause_after_trip_lock(*, db, driver_id, trip_id):
        trip = original_lock(db=db, driver_id=driver_id, trip_id=trip_id)
        trip_locked.set()
        if not release_arriving.wait(timeout=5):
            raise TimeoutError("test did not release mark_trip_arriving")
        return trip

    monkeypatch.setattr(trips, "_get_trip_for_driver_locked", pause_after_trip_lock)

    def run_arriving() -> None:
        thread_db = SessionLocal()
        try:
            trips.mark_trip_arriving(
                db=thread_db,
                driver_id=str(driver_id),
                trip_id=str(trip_id),
            )
            outcomes.put(("arriving", "ok"))
        except BaseException as exc:
            outcomes.put(("arriving_error", exc))
        finally:
            thread_db.close()

    def run_timeouts() -> None:
        connection = engine.connect()

        def note_first_statement(*_args, **_kwargs) -> None:
            timeout_statement_started.set()

        event.listen(
            connection, "before_cursor_execute", note_first_statement, once=True
        )
        thread_db = Session(bind=connection)
        try:
            counts = trip_timeouts.run_trip_timeouts(thread_db)
            outcomes.put(("accepted_to_cancelled", counts["accepted_to_cancelled"]))
        except BaseException as exc:
            outcomes.put(("timeout_error", exc))
        finally:
            thread_db.close()
            connection.close()
            timeout_done.set()

    arriving_thread = threading.Thread(target=run_arriving)
    timeout_thread = threading.Thread(target=run_timeouts)
    arriving_thread.start()
    assert trip_locked.wait(timeout=5)
    timeout_thread.start()
    assert timeout_statement_started.wait(timeout=5)
    time.sleep(0.1)
    try:
        assert not timeout_done.is_set()
    finally:
        release_arriving.set()

    arriving_thread.join(timeout=5)
    timeout_thread.join(timeout=5)
    assert not arriving_thread.is_alive()
    assert not timeout_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "arriving": "ok",
        "accepted_to_cancelled": 0,
    }

    verify_db = SessionLocal()
    try:
        trip = verify_db.get(Trip, trip_id)
        driver = verify_db.get(Driver, driver_id)
        assert trip is not None
        assert driver is not None
        assert trip.status == TripStatus.arriving
        assert driver.is_available is False
    finally:
        verify_db.close()


def test_ongoing_timeout_cannot_overwrite_concurrent_complete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Timeout must not rewrite completed→failed after settlement commits."""
    _isolate_timeout_cutoffs(monkeypatch)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id = _seed_stale_ongoing_trip()

    trip_locked = threading.Event()
    release_complete = threading.Event()
    timeout_statement_started = threading.Event()
    timeout_done = threading.Event()
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

    def run_timeouts() -> None:
        connection = engine.connect()

        def note_first_statement(*_args, **_kwargs) -> None:
            timeout_statement_started.set()

        event.listen(
            connection, "before_cursor_execute", note_first_statement, once=True
        )
        thread_db = Session(bind=connection)
        try:
            counts = trip_timeouts.run_trip_timeouts(thread_db)
            outcomes.put(("ongoing_to_failed", counts["ongoing_to_failed"]))
        except BaseException as exc:
            outcomes.put(("timeout_error", exc))
        finally:
            thread_db.close()
            connection.close()
            timeout_done.set()

    complete_thread = threading.Thread(target=run_complete)
    timeout_thread = threading.Thread(target=run_timeouts)
    complete_thread.start()
    assert trip_locked.wait(timeout=5)
    timeout_thread.start()
    assert timeout_statement_started.wait(timeout=5)
    time.sleep(0.1)
    try:
        assert not timeout_done.is_set()
    finally:
        release_complete.set()

    complete_thread.join(timeout=5)
    timeout_thread.join(timeout=5)
    assert not complete_thread.is_alive()
    assert not timeout_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "complete": "ok",
        "ongoing_to_failed": 0,
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


def test_accepted_timeout_still_cancels_stale_trip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    driver_id, trip_id = _seed_stale_accepted_trip()

    db = SessionLocal()
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.get(Trip, trip_id)
        driver = db.get(Driver, driver_id)
        assert counts["accepted_to_cancelled"] == 1
        assert trip is not None and trip.status == TripStatus.cancelled
        assert driver is not None and driver.is_available is True
    finally:
        db.close()
