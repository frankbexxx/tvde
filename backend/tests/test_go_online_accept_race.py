"""Race: concurrent go_online must not overwrite accept's is_available=False."""

from __future__ import annotations

import asyncio
import queue
import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.api.deps import UserContext
from app.api.routers import driver_status
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


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _seed_offline_driver_with_offer() -> tuple[uuid.UUID, uuid.UUID]:
    """Driver starts offline so go_online emits a real UPDATE (False→True)."""
    db = SessionLocal()
    try:
        partner_id = uuid.uuid4()
        passenger = User(
            role=Role.passenger,
            name="Go Online Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Go Online Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=partner_id, name=f"Go Online Fleet {partner_id}"),
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
                is_available=False,
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


def test_second_go_online_serializes_with_offer_accept(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Multi-tab: first go_online + accept; second go_online must not restore True.

    Concrete trigger: two POST /driver/status/online while offline (separate tabs
    each bypass availabilitySyncing). First commits True; accept holds Driver
    FOR UPDATE during Stripe/compliance; second waits on the row lock and must
    re-check the active trip instead of overwriting is_available=True.
    """
    driver_id, offer_id = _seed_offline_driver_with_offer()
    acceptance_holds_driver = threading.Event()
    release_acceptance = threading.Event()
    second_online_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()

    monkeypatch.setattr(settings, "STRIPE_MOCK", True)
    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_COMPLIANCE", False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False)

    def pause_acceptance_after_driver_lock(_db, _driver_id) -> None:
        acceptance_holds_driver.set()
        if not release_acceptance.wait(timeout=5):
            raise TimeoutError("test did not release trip acceptance")

    monkeypatch.setattr(
        trips,
        "assert_driver_can_accept_by_driving_hours",
        pause_acceptance_after_driver_lock,
    )

    # First go_online: offline → online (required before accept).
    first_db = SessionLocal()
    try:
        first = asyncio.run(
            driver_status.go_online(
                user=UserContext(user_id=str(driver_id), role=Role.driver),
                db=first_db,
            )
        )
    finally:
        first_db.close()
    assert first["is_available"] is True

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

    def run_second_go_online() -> None:
        thread_db = SessionLocal()
        try:
            result = asyncio.run(
                driver_status.go_online(
                    user=UserContext(user_id=str(driver_id), role=Role.driver),
                    db=thread_db,
                )
            )
            outcomes.put(("go_online", result))
        except BaseException as exc:
            outcomes.put(("go_online_error", exc))
        finally:
            thread_db.close()
            second_online_done.set()

    acceptance_thread = threading.Thread(target=run_acceptance)
    go_online_thread = threading.Thread(target=run_second_go_online)
    acceptance_thread.start()
    assert acceptance_holds_driver.wait(timeout=5)
    go_online_thread.start()
    # Second go_online must block on Driver FOR UPDATE while accept holds.
    assert not second_online_done.wait(timeout=0.35)
    try:
        release_acceptance.set()
        acceptance_thread.join(timeout=5)
        go_online_thread.join(timeout=5)
        assert not acceptance_thread.is_alive()
        assert not go_online_thread.is_alive()
    finally:
        release_acceptance.set()

    results = dict(outcomes.get_nowait() for _ in range(outcomes.qsize()))
    assert "acceptance_error" not in results, results
    assert "go_online_error" not in results, results
    assert results.get("acceptance") == TripStatus.accepted
    go_online_result = results.get("go_online")
    assert isinstance(go_online_result, dict)
    assert go_online_result.get("is_available") is False

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_id)
        assert driver is not None
        assert driver.is_available is False
        offer = verify_db.get(TripOffer, offer_id)
        assert offer is not None
        accepted = verify_db.get(Trip, offer.trip_id)
        assert accepted is not None
        assert accepted.status == TripStatus.accepted
        assert accepted.driver_id == driver_id
    finally:
        verify_db.close()
