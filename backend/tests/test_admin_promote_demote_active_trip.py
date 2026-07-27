"""Admin promote/demote/delete must not clobber live trips or restore dispatch mid-trip.

Trip.driver_id is ON DELETE SET NULL — deleting Driver during/after accept would
detach an accepted trip from its driver while Payment(processing) remains.
"""

from __future__ import annotations

import queue
import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import event, text
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import (
    DriverStatus,
    OfferStatus,
    PaymentStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services import trips
from app.api.routers import admin as admin_router

SUPER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


@pytest.fixture
def super_admin_ctx() -> None:
    async def _super() -> UserContext:
        return UserContext(user_id=SUPER_ID, role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _super
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _ensure_partner(db: Session) -> uuid.UUID:
    pid = DEFAULT_PARTNER_UUID
    if db.get(Partner, pid) is None:
        db.add(Partner(id=pid, name="Default fleet (test)"))
        db.flush()
    return pid


def _seed_driver_with_active_trip(
    *, status: TripStatus = TripStatus.accepted
) -> uuid.UUID:
    db = SessionLocal()
    try:
        partner_id = _ensure_partner(db)
        passenger = User(
            role=Role.passenger,
            name="Promote Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Promote Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([passenger, driver_user])
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
            driver_id=driver_user.id,
            status=status,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
            distance_km=3.0,
            duration_min=12.0,
        )
        db.add(trip)
        db.flush()
        db.add(
            Payment(
                trip_id=trip.id,
                total_amount=0.5,
                commission_amount=0.08,
                driver_amount=0.42,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
            )
        )
        db.commit()
        return driver_user.id
    finally:
        db.close()


def _seed_offer_accept() -> tuple[uuid.UUID, uuid.UUID]:
    db = SessionLocal()
    try:
        partner_id = _ensure_partner(db)
        passenger = User(
            role=Role.passenger,
            name="Demote Race Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Demote Race Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([passenger, driver_user])
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


@pytest.mark.usefixtures("super_admin_ctx")
def test_promote_existing_driver_does_not_force_online_during_active_trip(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    driver_id = _seed_driver_with_active_trip()

    r = client.post(
        f"/admin/users/{driver_id}/promote-driver",
        json={"governance_reason": "retry promote during live trip xx"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("message") == "Driver already exists, role updated"

    db = SessionLocal()
    try:
        driver = db.get(Driver, driver_id)
        assert driver is not None
        assert driver.is_available is False
        trip = db.execute(
            text(
                "SELECT status::text, driver_id FROM trips "
                "WHERE driver_id = :did AND status = 'accepted' LIMIT 1"
            ),
            {"did": str(driver_id)},
        ).first()
        assert trip is not None
        assert trip[1] == driver_id
    finally:
        db.close()


@pytest.mark.usefixtures("super_admin_ctx")
def test_delete_user_blocked_during_active_driver_trip(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    driver_id = _seed_driver_with_active_trip()

    r = client.request(
        "DELETE",
        f"/admin/users/{driver_id}",
        json={"governance_reason": "delete during live trip xxxxx"},
    )
    assert r.status_code == 409, r.text
    assert r.json().get("detail") == "driver_has_active_trip"

    db = SessionLocal()
    try:
        driver = db.get(Driver, driver_id)
        assert driver is not None
        trip = (
            db.execute(
                text(
                    "SELECT status::text, driver_id FROM trips "
                    "WHERE driver_id = :did LIMIT 1"
                ),
                {"did": str(driver_id)},
            ).first()
        )
        assert trip is not None
        assert trip[0] == "accepted"
        assert trip[1] == driver_id
    finally:
        db.close()


@pytest.mark.usefixtures("super_admin_ctx")
def test_demote_blocked_when_active_trip_already_committed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    driver_id = _seed_driver_with_active_trip()

    r = client.post(
        f"/admin/users/{driver_id}/demote-driver",
        json={"governance_reason": "demote during live trip xxxxx"},
    )
    assert r.status_code == 409, r.text
    assert r.json().get("detail") == "driver_has_active_trip"


def test_demote_serializes_with_offer_accept(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Accept holds Driver FOR UPDATE; demote must wait and then 409."""
    driver_id, offer_id = _seed_offer_accept()
    acceptance_holds_driver = threading.Event()
    release_acceptance = threading.Event()
    demote_lock_started = threading.Event()
    demote_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()

    monkeypatch.setattr(settings, "STRIPE_MOCK", True)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)

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

    def run_demote() -> None:
        connection = engine.connect()

        def note_driver_lock_started(*_args, **_kwargs) -> None:
            demote_lock_started.set()

        event.listen(
            connection,
            "before_cursor_execute",
            note_driver_lock_started,
            once=True,
        )
        thread_db = Session(bind=connection)
        try:
            body = admin_router.AdminGovernanceReasonBody(
                governance_reason="demote while accept holds lock xx"
            )
            # Call service path via async route coroutine with a fake user ctx.
            import asyncio

            async def _call() -> dict:
                return await admin_router.demote_user_from_driver(
                    user_id=str(driver_id),
                    body=body,
                    admin_ctx=UserContext(
                        user_id=SUPER_ID, role=Role.super_admin
                    ),
                    db=thread_db,
                )

            asyncio.run(_call())
            outcomes.put(("demote", "unexpected_success"))
        except HTTPException as exc:
            outcomes.put(("demote_error", (exc.status_code, exc.detail)))
        except BaseException as exc:
            outcomes.put(("demote_exception", exc))
        finally:
            thread_db.close()
            connection.close()
            demote_done.set()

    acceptance_thread = threading.Thread(target=run_acceptance)
    demote_thread = threading.Thread(target=run_demote)
    acceptance_thread.start()
    assert acceptance_holds_driver.wait(timeout=5)
    demote_thread.start()
    assert demote_lock_started.wait(timeout=5)
    try:
        assert not demote_done.wait(timeout=0.25)
    finally:
        release_acceptance.set()

    acceptance_thread.join(timeout=5)
    demote_thread.join(timeout=5)
    assert not acceptance_thread.is_alive()
    assert not demote_thread.is_alive()
    assert dict(outcomes.get_nowait() for _ in range(2)) == {
        "acceptance": TripStatus.accepted,
        "demote_error": (409, "driver_has_active_trip"),
    }

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
