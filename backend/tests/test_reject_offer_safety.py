"""Safety tests for reject_offer locking (PR: safe reject_offer locking)."""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services import trips as trips_service


def _make_db() -> Session:
    return SessionLocal()


def _create_driver_with_location(
    db: Session, lat: float = 38.7, lng: float = -9.1, *, is_available: bool = True
) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=is_available,
    )
    db.add(driver)
    db.flush()
    loc = DriverLocation(
        driver_id=user.id,
        lat=lat,
        lng=lng,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(loc)
    db.commit()
    return str(user.id)


def _create_passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


def _override_deps(db: Session, user_ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


def _create_trip_with_offer(db: Session) -> tuple[str, str, str]:
    """Returns (driver_id, passenger_id, offer_id)."""
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    driver_id = _create_driver_with_location(db)
    passenger_id = _create_passenger(db)
    _override_deps(db, UserContext(user_id=passenger_id, role=Role.passenger))
    client = TestClient(app)
    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )
    assert r.status_code == 200, r.text
    trip_id = r.json()["trip_id"]
    offers = list(
        db.execute(select(TripOffer).where(TripOffer.trip_id == uuid.UUID(trip_id)))
        .scalars()
        .all()
    )
    assert len(offers) >= 1
    offer = next(o for o in offers if str(o.driver_id) == driver_id)
    return driver_id, passenger_id, str(offer.id)


def test_reject_offer_forbidden_for_other_driver() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        other_driver = _create_driver_with_location(db, 38.71, -9.11)
        assert other_driver != driver_id

        _override_deps(db, UserContext(user_id=other_driver, role=Role.driver))
        client = TestClient(app)
        r = client.post(f"/driver/offers/{offer_id}/reject")
        assert r.status_code == 403
        assert r.json().get("detail") == "forbidden"

        offer = db.get(TripOffer, uuid.UUID(offer_id))
        assert offer is not None
        assert offer.status == OfferStatus.pending
    finally:
        _reset_overrides()
        db.close()


def test_reject_offer_conflict_when_already_rejected() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)

        r1 = client.post(f"/driver/offers/{offer_id}/reject")
        assert r1.status_code == 200
        assert r1.json() == {"status": "rejected"}

        r2 = client.post(f"/driver/offers/{offer_id}/reject")
        assert r2.status_code == 409
        assert r2.json().get("detail") == "offer_already_taken"
    finally:
        _reset_overrides()
        db.close()


def test_reject_offer_conflict_when_already_accepted() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)

        r_accept = client.post(f"/driver/offers/{offer_id}/accept")
        assert r_accept.status_code == 200, r_accept.text

        r_reject = client.post(f"/driver/offers/{offer_id}/reject")
        assert r_reject.status_code == 409
        assert r_reject.json().get("detail") == "offer_already_taken"

        offer = db.get(TripOffer, uuid.UUID(offer_id))
        assert offer is not None
        assert offer.status == OfferStatus.accepted
    finally:
        _reset_overrides()
        db.close()


def test_reject_offer_conflict_when_expired() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        offer = db.get(TripOffer, uuid.UUID(offer_id))
        assert offer is not None
        offer.status = OfferStatus.expired
        offer.expires_at = datetime.now(timezone.utc) - timedelta(seconds=5)
        db.commit()

        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)
        r = client.post(f"/driver/offers/{offer_id}/reject")
        assert r.status_code == 409
        assert r.json().get("detail") == "offer_already_taken"
    finally:
        _reset_overrides()
        db.close()


def test_reject_offer_conflict_when_trip_no_longer_requested() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        offer = db.get(TripOffer, uuid.UUID(offer_id))
        assert offer is not None
        trip = db.get(Trip, offer.trip_id)
        assert trip is not None
        trip.status = TripStatus.assigned
        db.commit()

        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)
        r = client.post(f"/driver/offers/{offer_id}/reject")
        assert r.status_code == 409
        assert r.json().get("detail") == "offer_already_taken"

        db.refresh(offer)
        assert offer.status == OfferStatus.pending
    finally:
        _reset_overrides()
        db.close()


def test_reject_offer_conflict_when_trip_already_has_driver() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        other = _create_driver_with_location(db, 38.72, -9.12)
        offer = db.get(TripOffer, uuid.UUID(offer_id))
        assert offer is not None
        trip = db.get(Trip, offer.trip_id)
        assert trip is not None
        # Inconsistent but must not allow reject to "win"
        trip.driver_id = uuid.UUID(other)
        db.commit()

        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)
        r = client.post(f"/driver/offers/{offer_id}/reject")
        assert r.status_code == 409
        assert r.json().get("detail") == "offer_already_taken"
    finally:
        _reset_overrides()
        db.close()


def test_rejected_offer_no_longer_listed_as_pending() -> None:
    db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(db)
        _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
        client = TestClient(app)

        before = client.get("/driver/offers")
        assert before.status_code == 200
        assert any(o["offer_id"] == offer_id for o in before.json())

        r = client.post(f"/driver/offers/{offer_id}/reject")
        assert r.status_code == 200

        after = client.get("/driver/offers")
        assert after.status_code == 200
        assert all(o["offer_id"] != offer_id for o in after.json())
    finally:
        _reset_overrides()
        db.close()


def test_accept_vs_reject_concurrent_leaves_coherent_state() -> None:
    """One of accept/reject wins; never leave accepted trip with rejected offer."""
    setup_db = _make_db()
    try:
        driver_id, _passenger_id, offer_id = _create_trip_with_offer(setup_db)
        offer_uuid = uuid.UUID(offer_id)
        trip_id = setup_db.get(TripOffer, offer_uuid).trip_id
    finally:
        _reset_overrides()
        setup_db.close()

    barrier = threading.Barrier(2)
    results: dict[str, object] = {}

    def run_accept() -> None:
        db = SessionLocal()
        try:
            barrier.wait(timeout=10)
            trip, _secret = trips_service.accept_offer(
                db=db, driver_id=driver_id, offer_id=offer_id
            )
            results["accept"] = ("ok", str(trip.status.value))
        except HTTPException as e:
            results["accept"] = ("http", e.status_code, e.detail)
        except Exception as e:  # noqa: BLE001 — capture for assertion
            results["accept"] = ("err", type(e).__name__, str(e))
        finally:
            db.close()

    def run_reject() -> None:
        db = SessionLocal()
        try:
            barrier.wait(timeout=10)
            offer = trips_service.reject_offer(
                db=db, driver_id=driver_id, offer_id=offer_id
            )
            results["reject"] = ("ok", str(offer.status.value))
        except HTTPException as e:
            results["reject"] = ("http", e.status_code, e.detail)
        except Exception as e:  # noqa: BLE001
            results["reject"] = ("err", type(e).__name__, str(e))
        finally:
            db.close()

    t_accept = threading.Thread(target=run_accept)
    t_reject = threading.Thread(target=run_reject)
    t_accept.start()
    t_reject.start()
    t_accept.join(timeout=30)
    t_reject.join(timeout=30)
    assert not t_accept.is_alive() and not t_reject.is_alive()

    accept_res = results.get("accept")
    reject_res = results.get("reject")
    assert accept_res is not None and reject_res is not None

    ok_accept = isinstance(accept_res, tuple) and accept_res[0] == "ok"
    ok_reject = isinstance(reject_res, tuple) and reject_res[0] == "ok"
    assert ok_accept ^ ok_reject, (accept_res, reject_res)

    verify = SessionLocal()
    try:
        offer = verify.get(TripOffer, offer_uuid)
        trip = verify.get(Trip, trip_id)
        assert offer is not None and trip is not None

        if ok_accept:
            assert offer.status == OfferStatus.accepted
            assert trip.status in (TripStatus.accepted, TripStatus.assigned)
            assert trip.driver_id is not None
            assert str(trip.driver_id) == driver_id
            assert isinstance(reject_res, tuple) and reject_res[0] == "http"
            assert reject_res[1] == 409
        else:
            assert offer.status == OfferStatus.rejected
            assert trip.status == TripStatus.requested
            assert trip.driver_id is None
            assert isinstance(accept_res, tuple) and accept_res[0] == "http"
            assert accept_res[1] == 409
    finally:
        verify.close()
