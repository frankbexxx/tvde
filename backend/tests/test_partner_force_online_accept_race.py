"""Race: partner force-online must not overwrite accept's is_available=False."""

from __future__ import annotations

import queue
import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import event, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import (
    DriverStatus,
    OfferStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services import trips
from app.services.partner_fleet import set_partner_driver_availability


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _seed_offer_accept() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Force Online Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Force Online Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=partner_id, name=f"Force Online Fleet {partner_id}"),
                passenger,
                driver_user,
            ]
        )
        db.flush()
        db.add(
            Driver(
                user_id=driver_user.id,
                partner_id=partner_id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
                vehicle_categories="x",
            )
        )
        trip = Trip(
            passenger_id=passenger.id,
            status=TripStatus.requested,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
        )
        db.add(trip)
        db.flush()
        offer = TripOffer(
            trip_id=trip.id,
            driver_id=driver_user.id,
            status=OfferStatus.pending,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
        )
        db.add(offer)
        db.commit()
        return partner_id, driver_user.id, offer.id
    finally:
        db.close()


def test_force_online_serializes_with_offer_accept(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Accept holds Driver FOR UPDATE; force-online must wait and then 409."""
    partner_id, driver_id, offer_id = _seed_offer_accept()
    acceptance_holds_driver = threading.Event()
    release_acceptance = threading.Event()
    force_online_lock_started = threading.Event()
    force_online_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()

    monkeypatch.setattr(settings, "STRIPE_MOCK", True)

    def pause_acceptance_after_driver_lock(_db, _driver_id) -> None:
        acceptance_holds_driver.set()
        if not release_acceptance.wait(timeout=5):
            raise TimeoutError("test did not release trip acceptance")

    monkeypatch.setattr(
        trips,
        "assert_driver_can_accept_by_driving_hours",
        pause_acceptance_after_driver_lock,
    )

    def run_acceptance() -> None:
        thread_db = SessionLocal()
        try:
            trip, _ = trips.accept_offer(
                db=thread_db,
                driver_id=str(driver_id),
                offer_id=str(offer_id),
            )
            outcomes.put(("acceptance", trip.status))
        except BaseException as exc:
            outcomes.put(("acceptance_error", exc))
        finally:
            thread_db.close()

    def run_force_online() -> None:
        connection = engine.connect()

        def note_driver_lock_started(*_args, **_kwargs) -> None:
            force_online_lock_started.set()

        event.listen(
            connection,
            "before_cursor_execute",
            note_driver_lock_started,
            once=True,
        )
        thread_db = Session(bind=connection)
        try:
            set_partner_driver_availability(
                thread_db,
                partner_id=str(partner_id),
                driver_user_id=driver_id,
                online=True,
            )
            outcomes.put(("force_online", "unexpected_success"))
        except HTTPException as exc:
            outcomes.put(("force_online_error", (exc.status_code, exc.detail)))
        except BaseException as exc:
            outcomes.put(("force_online_exception", exc))
        finally:
            thread_db.close()
            connection.close()
            force_online_done.set()

    acceptance_thread = threading.Thread(target=run_acceptance)
    force_online_thread = threading.Thread(target=run_force_online)
    acceptance_thread.start()
    assert acceptance_holds_driver.wait(timeout=5)
    force_online_thread.start()
    assert force_online_lock_started.wait(timeout=5)
    try:
        # Without FOR UPDATE on force-online, this would finish while accept holds.
        assert not force_online_done.wait(timeout=0.25)
    finally:
        release_acceptance.set()

    acceptance_thread.join(timeout=5)
    force_online_thread.join(timeout=5)
    assert not acceptance_thread.is_alive()
    assert not force_online_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "acceptance": TripStatus.accepted,
        "force_online_error": (409, "driver_has_active_trip"),
    }

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_id)
        trip = verify_db.get(TripOffer, offer_id)
        assert driver is not None
        assert driver.is_available is False
        assert trip is not None
        accepted = verify_db.get(Trip, trip.trip_id)
        assert accepted is not None
        assert accepted.status == TripStatus.accepted
        assert accepted.driver_id == driver_id
    finally:
        verify_db.close()
