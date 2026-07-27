"""Partner disable must block accept of outstanding offers / assigned trips."""

from __future__ import annotations

import queue
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text

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
    Role,
    TripStatus,
    UserStatus,
)
from app.services import partner_fleet, trips


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _seed_approved_driver_with_pending_offer() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Disable Accept Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Disable Accept Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=partner_id, name=f"Disable Accept Fleet {partner_id}"),
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
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add(offer)
        db.commit()
        return partner_id, driver_user.id, offer.id
    finally:
        db.close()


def _seed_approved_driver_with_assigned_trip() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Disable Assign Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Disable Assign Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=partner_id, name=f"Disable Assign Fleet {partner_id}"),
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
            status=TripStatus.assigned,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
        )
        db.add(trip)
        db.commit()
        return partner_id, driver_user.id, trip.id
    finally:
        db.close()


def test_partner_disable_expires_offers_and_blocks_accept_offer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    partner_id, driver_id, offer_id = _seed_approved_driver_with_pending_offer()

    db = SessionLocal()
    try:
        partner_fleet.set_partner_driver_enabled(
            db,
            partner_id=str(partner_id),
            driver_user_id=driver_id,
            enabled=False,
        )
    finally:
        db.close()

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_id)
        offer = verify_db.get(TripOffer, offer_id)
        assert driver is not None
        assert driver.status == DriverStatus.rejected
        assert driver.is_available is False
        assert offer is not None
        assert offer.status == OfferStatus.expired
    finally:
        verify_db.close()

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_info:
            trips.accept_offer(
                db=db,
                driver_id=str(driver_id),
                offer_id=str(offer_id),
            )
        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == "offer_already_taken"
        offer = db.get(TripOffer, offer_id)
        assert offer is not None
        payment = db.execute(
            select(Payment).where(Payment.trip_id == offer.trip_id)
        ).scalar_one_or_none()
        assert payment is None
        trip = db.get(Trip, offer.trip_id)
        assert trip is not None
        assert trip.status == TripStatus.requested
        assert trip.driver_id is None
    finally:
        db.close()


def test_accept_offer_rejects_partner_disabled_driver_even_if_offer_still_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Defense in depth: approved check under Driver lock even if offer left pending."""
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    _partner_id, driver_id, offer_id = _seed_approved_driver_with_pending_offer()

    db = SessionLocal()
    try:
        driver = db.get(Driver, driver_id)
        assert driver is not None
        driver.status = DriverStatus.rejected
        # Leave is_available=True and offer pending to simulate the old disable path.
        db.commit()
    finally:
        db.close()

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_info:
            trips.accept_offer(
                db=db,
                driver_id=str(driver_id),
                offer_id=str(offer_id),
            )
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "forbidden"
        offer = db.get(TripOffer, offer_id)
        assert offer is not None
        payment = db.execute(
            select(Payment).where(Payment.trip_id == offer.trip_id)
        ).scalar_one_or_none()
        assert payment is None
        trip = db.get(Trip, offer.trip_id)
        assert trip is not None
        assert trip.status == TripStatus.requested
    finally:
        db.close()


def test_accept_trip_rejects_partner_disabled_driver(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    partner_id, driver_id, trip_id = _seed_approved_driver_with_assigned_trip()

    db = SessionLocal()
    try:
        partner_fleet.set_partner_driver_enabled(
            db,
            partner_id=str(partner_id),
            driver_user_id=driver_id,
            enabled=False,
        )
    finally:
        db.close()

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_info:
            trips.accept_trip(
                db=db,
                driver_id=str(driver_id),
                trip_id=str(trip_id),
            )
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "forbidden"
        payment = db.execute(
            select(Payment).where(Payment.trip_id == trip_id)
        ).scalar_one_or_none()
        assert payment is None
        trip = db.get(Trip, trip_id)
        assert trip is not None
        assert trip.status == TripStatus.assigned
        assert trip.driver_id is None
    finally:
        db.close()


def test_partner_disable_does_not_deadlock_with_concurrent_accept_offer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Disable must not mutate offers while holding Driver FOR UPDATE.

    Concrete trigger: accept_offer locks Offer→Trip then waits for Driver;
    disable locks Driver then UPDATEs the same offer → PostgreSQL deadlock.
    Victim is often disable: accept creates Payment while driver stays approved.
    """
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    partner_id, driver_id, offer_id = _seed_approved_driver_with_pending_offer()

    accept_has_trip_lock = threading.Event()
    disable_has_driver_lock = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()

    def run_accept() -> None:
        thread_db = SessionLocal()
        real_execute = thread_db.execute
        stage = {"seen_offer": False, "paused": False}

        def wrapped_execute(statement, *args, **kwargs):  # type: ignore[no-untyped-def]
            result = real_execute(statement, *args, **kwargs)
            sql = str(statement)
            if "trip_offers" in sql.lower() and "FOR UPDATE" in sql.upper():
                stage["seen_offer"] = True
            if (
                stage["seen_offer"]
                and not stage["paused"]
                and "trips" in sql.lower()
                and "FOR UPDATE" in sql.upper()
                and "trip_offers" not in sql.lower()
            ):
                stage["paused"] = True
                accept_has_trip_lock.set()
                assert disable_has_driver_lock.wait(timeout=5)
                # Let disable reach its post-Driver work while we still hold Offer.
                time.sleep(0.25)
            return result

        thread_db.execute = wrapped_execute  # type: ignore[method-assign]
        try:
            with pytest.raises(HTTPException) as exc_info:
                trips.accept_offer(
                    db=thread_db,
                    driver_id=str(driver_id),
                    offer_id=str(offer_id),
                )
            outcomes.put(("accept_status", exc_info.value.status_code))
            outcomes.put(("accept_detail", exc_info.value.detail))
        except BaseException as exc:
            outcomes.put(("accept_error", exc))
        finally:
            thread_db.close()

    def run_disable() -> None:
        thread_db = SessionLocal()
        real_execute = thread_db.execute
        signaled = {"done": False}

        def wrapped_execute(statement, *args, **kwargs):  # type: ignore[no-untyped-def]
            result = real_execute(statement, *args, **kwargs)
            sql = str(statement)
            if (
                not signaled["done"]
                and "drivers" in sql.lower()
                and "FOR UPDATE" in sql.upper()
            ):
                signaled["done"] = True
                disable_has_driver_lock.set()
            return result

        thread_db.execute = wrapped_execute  # type: ignore[method-assign]
        try:
            assert accept_has_trip_lock.wait(timeout=5)
            partner_fleet.set_partner_driver_enabled(
                thread_db,
                partner_id=str(partner_id),
                driver_user_id=driver_id,
                enabled=False,
            )
            outcomes.put(("disable", "ok"))
        except BaseException as exc:
            outcomes.put(("disable_error", exc))
        finally:
            thread_db.close()

    accept_thread = threading.Thread(target=run_accept)
    disable_thread = threading.Thread(target=run_disable)
    accept_thread.start()
    assert accept_has_trip_lock.wait(timeout=5)
    disable_thread.start()
    accept_thread.join(timeout=15)
    disable_thread.join(timeout=15)
    assert not accept_thread.is_alive()
    assert not disable_thread.is_alive()

    results = dict(outcomes.get_nowait() for _ in range(outcomes.qsize()))
    assert "disable_error" not in results, results
    assert "accept_error" not in results, results
    assert results.get("disable") == "ok"
    # Accept may see expired offer (409) or rejected driver (403); never Payment.
    assert results.get("accept_status") in {403, 409}

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_id)
        offer = verify_db.get(TripOffer, offer_id)
        assert driver is not None
        assert driver.status == DriverStatus.rejected
        assert driver.is_available is False
        assert offer is not None
        assert offer.status == OfferStatus.expired
        payment = verify_db.execute(
            select(Payment).where(Payment.trip_id == offer.trip_id)
        ).scalar_one_or_none()
        assert payment is None
        trip = verify_db.get(Trip, offer.trip_id)
        assert trip is not None
        assert trip.status == TripStatus.requested
        assert trip.driver_id is None
    finally:
        verify_db.close()
