"""Race: unlocked admin assign must not overwrite accept_offer (accepted→assigned)."""

from __future__ import annotations

import queue
import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import event, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import (
    DriverStatus,
    OfferStatus,
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


def _seed_requested_trip_with_offer() -> tuple[uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Assign Accept Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Assign Accept Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=partner_id, name=f"Assign Race Fleet {partner_id}"),
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
        return driver_user.id, offer.id
    finally:
        db.close()


def test_assign_trip_cannot_overwrite_concurrent_accept_offer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Admin assign must wait on trip FOR UPDATE and 409 after accept commits."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, offer_id = _seed_requested_trip_with_offer()

    acceptance_holds_trip = threading.Event()
    release_acceptance = threading.Event()
    assign_statement_started = threading.Event()
    assign_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()

    def pause_acceptance_after_trip_lock(_db, _driver_id) -> None:
        acceptance_holds_trip.set()
        if not release_acceptance.wait(timeout=5):
            raise TimeoutError("test did not release trip acceptance")

    monkeypatch.setattr(
        trips,
        "assert_driver_can_accept_by_driving_hours",
        pause_acceptance_after_trip_lock,
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

    def run_assign() -> None:
        connection = engine.connect()

        def note_first_statement(*_args, **_kwargs) -> None:
            assign_statement_started.set()

        event.listen(
            connection, "before_cursor_execute", note_first_statement, once=True
        )
        thread_db = Session(bind=connection)
        try:
            offer = thread_db.get(TripOffer, offer_id)
            assert offer is not None
            trips.assign_trip(db=thread_db, trip_id=str(offer.trip_id))
            outcomes.put(("assign", "unexpected_success"))
        except HTTPException as exc:
            outcomes.put(("assign_status", exc.status_code))
        except BaseException as exc:
            outcomes.put(("assign_error", exc))
        finally:
            thread_db.close()
            connection.close()
            assign_done.set()

    acceptance_thread = threading.Thread(target=run_acceptance)
    assign_thread = threading.Thread(target=run_assign)
    acceptance_thread.start()
    assert acceptance_holds_trip.wait(timeout=5)
    assign_thread.start()
    assert assign_statement_started.wait(timeout=5)
    try:
        # Without Trip FOR UPDATE on assign_trip, assign would finish while
        # accept still holds the row and could commit accepted→assigned.
        assert not assign_done.wait(timeout=0.25)
    finally:
        release_acceptance.set()

    acceptance_thread.join(timeout=5)
    assign_thread.join(timeout=5)
    assert not acceptance_thread.is_alive()
    assert not assign_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "acceptance": TripStatus.accepted,
        "assign_status": 409,
    }

    verify_db = SessionLocal()
    try:
        offer = verify_db.get(TripOffer, offer_id)
        assert offer is not None
        trip = verify_db.get(Trip, offer.trip_id)
        payment = verify_db.execute(
            select(Payment).where(Payment.trip_id == offer.trip_id)
        ).scalar_one_or_none()
        driver = verify_db.get(Driver, driver_id)
        assert trip is not None
        assert trip.status == TripStatus.accepted
        assert trip.driver_id == driver_id
        assert payment is not None
        assert payment.status == PaymentStatus.processing
        assert driver is not None
        assert driver.is_available is False
    finally:
        verify_db.close()


def test_accept_offer_rejects_existing_payment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Defense in depth: accept_offer must not create a second Payment row."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, offer_id = _seed_requested_trip_with_offer()

    seed_db = SessionLocal()
    try:
        offer = seed_db.get(TripOffer, offer_id)
        assert offer is not None
        seed_db.add(
            Payment(
                trip_id=offer.trip_id,
                total_amount=0.5,
                commission_amount=0.075,
                driver_amount=0.425,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=f"pi_mock_existing_{uuid.uuid4().hex[:12]}",
            )
        )
        seed_db.commit()
    finally:
        seed_db.close()

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_info:
            trips.accept_offer(
                db=db,
                driver_id=str(driver_id),
                offer_id=str(offer_id),
            )
        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == "Payment already exists for this trip."
    finally:
        db.close()
