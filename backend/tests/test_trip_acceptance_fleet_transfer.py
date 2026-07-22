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
from app.services.partners_admin import assign_driver_to_partner


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _seed_acceptance(
    accept_mode: str,
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        old_partner_id = uuid.uuid4()
        new_partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Acceptance Race Passenger",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Acceptance Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=old_partner_id, name=f"Old Fleet {old_partner_id}"),
                Partner(id=new_partner_id, name=f"New Fleet {new_partner_id}"),
                passenger,
                driver_user,
            ]
        )
        db.flush()
        db.add(
            Driver(
                user_id=driver_user.id,
                partner_id=old_partner_id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
                vehicle_categories="x",
            )
        )
        trip = Trip(
            passenger_id=passenger.id,
            status=(
                TripStatus.requested if accept_mode == "offer" else TripStatus.assigned
            ),
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
        )
        db.add(trip)
        db.flush()

        accept_id = trip.id
        if accept_mode == "offer":
            offer = TripOffer(
                trip_id=trip.id,
                driver_id=driver_user.id,
                status=OfferStatus.pending,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
            )
            db.add(offer)
            db.flush()
            accept_id = offer.id

        db.commit()
        return old_partner_id, new_partner_id, driver_user.id, accept_id
    finally:
        db.close()


@pytest.mark.parametrize("accept_mode", ["offer", "legacy"])
def test_trip_acceptance_serializes_with_fleet_transfer(
    monkeypatch: pytest.MonkeyPatch,
    accept_mode: str,
) -> None:
    old_partner_id, new_partner_id, driver_id, accept_id = _seed_acceptance(accept_mode)
    acceptance_holds_driver = threading.Event()
    release_acceptance = threading.Event()
    transfer_lock_started = threading.Event()
    transfer_done = threading.Event()
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
            if accept_mode == "offer":
                trip, _ = trips.accept_offer(
                    db=thread_db,
                    driver_id=str(driver_id),
                    offer_id=str(accept_id),
                )
            else:
                trip, _ = trips.accept_trip(
                    db=thread_db,
                    driver_id=str(driver_id),
                    trip_id=str(accept_id),
                )
            outcomes.put(("acceptance", trip.status))
        except BaseException as exc:
            outcomes.put(("acceptance_error", exc))
        finally:
            thread_db.close()

    def run_transfer() -> None:
        connection = engine.connect()

        def note_driver_lock_started(*_args, **_kwargs) -> None:
            transfer_lock_started.set()

        event.listen(
            connection,
            "before_cursor_execute",
            note_driver_lock_started,
            once=True,
        )
        thread_db = Session(bind=connection)
        try:
            assign_driver_to_partner(
                thread_db,
                driver_user_id=driver_id,
                partner_id=new_partner_id,
            )
            outcomes.put(("transfer", "unexpected_success"))
        except HTTPException as exc:
            outcomes.put(("transfer_error", (exc.status_code, exc.detail)))
        except BaseException as exc:
            outcomes.put(("transfer_exception", exc))
        finally:
            thread_db.close()
            connection.close()
            transfer_done.set()

    acceptance_thread = threading.Thread(target=run_acceptance)
    transfer_thread = threading.Thread(target=run_transfer)
    acceptance_thread.start()
    assert acceptance_holds_driver.wait(timeout=5)
    transfer_thread.start()
    assert transfer_lock_started.wait(timeout=5)
    try:
        assert not transfer_done.wait(timeout=0.25)
    finally:
        release_acceptance.set()

    acceptance_thread.join(timeout=5)
    transfer_thread.join(timeout=5)
    assert not acceptance_thread.is_alive()
    assert not transfer_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "acceptance": TripStatus.accepted,
        "transfer_error": (409, "driver_has_active_trip"),
    }

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_id)
        trip = verify_db.get(
            Trip,
            (
                verify_db.get(TripOffer, accept_id).trip_id
                if accept_mode == "offer"
                else accept_id
            ),
        )
        assert driver is not None
        assert driver.partner_id == old_partner_id
        assert trip is not None
        assert trip.status == TripStatus.accepted
        assert trip.driver_id == driver_id
    finally:
        verify_db.close()
