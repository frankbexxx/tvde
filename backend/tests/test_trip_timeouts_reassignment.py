from __future__ import annotations

import queue
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services import partner_trip_ops, trip_timeouts
from app.services.partner_trip_ops import partner_reassign_trip_driver
from app.services.partners_admin import assign_driver_to_partner


def _seed_stale_assigned_trip() -> tuple[
    uuid.UUID,
    uuid.UUID,
    uuid.UUID,
    uuid.UUID,
]:
    db = SessionLocal()
    try:
        fleet_id = uuid.uuid4()
        other_fleet_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Timeout Race Passenger",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        old_driver = User(
            role=Role.driver,
            name="Timeout Race Old Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        new_driver = User(
            role=Role.driver,
            name="Timeout Race New Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=fleet_id, name=f"Timeout Fleet {fleet_id}"),
                Partner(
                    id=other_fleet_id, name=f"Timeout Other Fleet {other_fleet_id}"
                ),
                passenger,
                old_driver,
                new_driver,
            ]
        )
        db.flush()
        db.add_all(
            [
                Driver(
                    user_id=old_driver.id,
                    partner_id=fleet_id,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                ),
                Driver(
                    user_id=new_driver.id,
                    partner_id=fleet_id,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                ),
            ]
        )
        trip = Trip(
            passenger_id=passenger.id,
            driver_id=old_driver.id,
            status=TripStatus.assigned,
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
        return fleet_id, other_fleet_id, trip.id, new_driver.id
    finally:
        db.close()


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


def test_assigned_timeout_returns_trip_to_unassigned_pool(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    _, _, trip_id, _ = _seed_stale_assigned_trip()

    db = SessionLocal()
    try:
        counts = trip_timeouts.run_trip_timeouts(db)
        trip = db.get(Trip, trip_id)

        assert counts["assigned_to_requested"] == 1
        assert trip is not None
        assert trip.status == TripStatus.requested
        assert trip.driver_id is None
    finally:
        db.close()


def test_timeout_cannot_overwrite_concurrent_partner_reassignment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_timeout_cutoffs(monkeypatch)
    fleet_id, other_fleet_id, trip_id, new_driver_id = _seed_stale_assigned_trip()

    drivers_locked = threading.Event()
    release_reassignment = threading.Event()
    timeout_statement_started = threading.Event()
    timeout_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()
    original_lock_partner_drivers = partner_trip_ops._lock_partner_drivers

    def pause_after_driver_locks(db, *, partner_id, driver_user_ids):
        result = original_lock_partner_drivers(
            db,
            partner_id=partner_id,
            driver_user_ids=driver_user_ids,
        )
        drivers_locked.set()
        if not release_reassignment.wait(timeout=5):
            raise TimeoutError("test did not release trip reassignment")
        return result

    monkeypatch.setattr(
        partner_trip_ops,
        "_lock_partner_drivers",
        pause_after_driver_locks,
    )

    def run_reassignment() -> None:
        thread_db = SessionLocal()
        try:
            partner_reassign_trip_driver(
                thread_db,
                partner_id=str(fleet_id),
                trip_id=trip_id,
                new_driver_user_id=new_driver_id,
            )
            outcomes.put(("reassignment", "ok"))
        except BaseException as exc:
            outcomes.put(("reassignment_error", exc))
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
            outcomes.put(("assigned_to_requested", counts["assigned_to_requested"]))
        except BaseException as exc:
            outcomes.put(("timeout_error", exc))
        finally:
            thread_db.close()
            connection.close()
            timeout_done.set()

    reassignment_thread = threading.Thread(target=run_reassignment)
    timeout_thread = threading.Thread(target=run_timeouts)
    reassignment_thread.start()
    assert drivers_locked.wait(timeout=5)
    timeout_thread.start()
    assert timeout_statement_started.wait(timeout=5)
    time.sleep(0.1)
    try:
        assert not timeout_done.is_set()
    finally:
        release_reassignment.set()

    reassignment_thread.join(timeout=5)
    timeout_thread.join(timeout=5)
    assert not reassignment_thread.is_alive()
    assert not timeout_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "reassignment": "ok",
        "assigned_to_requested": 0,
    }

    verify_db = SessionLocal()
    try:
        trip = verify_db.get(Trip, trip_id)
        assert trip is not None
        assert trip.status == TripStatus.assigned
        assert trip.driver_id == new_driver_id

        with pytest.raises(HTTPException) as exc_info:
            assign_driver_to_partner(
                verify_db,
                driver_user_id=new_driver_id,
                partner_id=other_fleet_id,
            )
        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == "driver_has_active_trip"
    finally:
        verify_db.close()
