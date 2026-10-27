"""GPS-09E: additive matching eligibility on GET /driver/status."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_documents import documents_blob_with_status
from app.services.driver_matching_eligibility import (
    REASON_DRIVER_NOT_APPROVED,
    REASON_LOCATION_MISSING,
    REASON_LOCATION_STALE,
    REASON_OFFLINE,
    evaluate_driver_matching_eligibility,
)
from app.services.location_freshness import (
    LOCATION_MAX_AGE_SECONDS,
    location_is_fresh_for_matching,
)
from app.services.offer_dispatch import create_offers_for_trip
from tests.support.unique_phone import unique_test_phone


def _make_db() -> Session:
    return SessionLocal()


def _create_user(db: Session, role: Role) -> User:
    user = User(
        role=role,
        name=f"{role.value} {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    return user


def _create_driver(
    db: Session,
    *,
    is_available: bool = True,
    status: DriverStatus = DriverStatus.approved,
    documents: str | None = None,
    active_vehicle_id: uuid.UUID | None = None,
) -> Driver:
    user = _create_user(db, Role.driver)
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=status,
        documents=documents,
        commission_percent=15.0,
        is_available=is_available,
        vehicle_categories="x",
        active_vehicle_id=active_vehicle_id,
    )
    db.add(driver)
    db.flush()
    return driver


def _set_location(db: Session, driver: Driver, *, age_seconds: float) -> datetime:
    now = datetime.now(timezone.utc)
    stamp = now - timedelta(seconds=age_seconds)
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver.user_id)
    ).scalar_one_or_none()
    if loc is None:
        loc = DriverLocation(
            driver_id=driver.user_id,
            lat=38.7,
            lng=-9.1,
            timestamp=stamp,
        )
        db.add(loc)
    else:
        loc.timestamp = stamp
    db.commit()
    db.refresh(driver)
    return stamp


def _override(db: Session, user_id: uuid.UUID) -> None:
    async def override_user() -> UserContext:
        return UserContext(user_id=str(user_id), role=Role.driver)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset() -> None:
    app.dependency_overrides.clear()


def test_freshness_boundary_matches_dispatch_window() -> None:
    now = datetime(2026, 10, 27, 12, 0, tzinfo=timezone.utc)
    at_limit = now - timedelta(seconds=LOCATION_MAX_AGE_SECONDS)
    just_over = now - timedelta(seconds=LOCATION_MAX_AGE_SECONDS, microseconds=1000)
    assert location_is_fresh_for_matching(at_limit, now=now) is True
    assert location_is_fresh_for_matching(just_over, now=now) is False


def test_online_fresh_gps_is_eligible() -> None:
    db = _make_db()
    driver = _create_driver(db)
    now = datetime.now(timezone.utc)
    _set_location(db, driver, age_seconds=10)
    snap = evaluate_driver_matching_eligibility(db, driver, now=now + timedelta(seconds=10))
    assert snap.matching_eligible is True
    assert snap.location_stale_for_matching is False
    assert snap.matching_ineligible_reason is None
    assert snap.gps_fix_age_seconds is not None
    assert snap.gps_fix_age_seconds <= LOCATION_MAX_AGE_SECONDS
    db.close()


def test_online_stale_gps_is_ineligible_and_stays_online() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=True)
    _set_location(db, driver, age_seconds=LOCATION_MAX_AGE_SECONDS + 10)
    before = driver.is_available
    snap = evaluate_driver_matching_eligibility(db, driver)
    db.refresh(driver)
    assert before is True
    assert driver.is_available is True
    assert snap.matching_eligible is False
    assert snap.location_stale_for_matching is True
    assert snap.matching_ineligible_reason == REASON_LOCATION_STALE
    assert snap.gps_fix_age_seconds is not None
    assert snap.gps_fix_age_seconds > LOCATION_MAX_AGE_SECONDS
    db.close()


def test_online_missing_location_is_ineligible() -> None:
    db = _make_db()
    driver = _create_driver(db)
    db.commit()
    snap = evaluate_driver_matching_eligibility(db, driver)
    assert snap.matching_eligible is False
    assert snap.location_stale_for_matching is False
    assert snap.gps_fix_age_seconds is None
    assert snap.matching_ineligible_reason == REASON_LOCATION_MISSING
    db.close()


def test_offline_fresh_gps_is_ineligible() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=False)
    _set_location(db, driver, age_seconds=5)
    snap = evaluate_driver_matching_eligibility(db, driver)
    assert snap.matching_eligible is False
    assert snap.location_stale_for_matching is False
    assert snap.matching_ineligible_reason == REASON_OFFLINE
    db.close()


def test_offline_stale_gps_reports_offline_and_stale_flag() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=False)
    _set_location(db, driver, age_seconds=LOCATION_MAX_AGE_SECONDS + 5)
    snap = evaluate_driver_matching_eligibility(db, driver)
    assert snap.matching_eligible is False
    assert snap.location_stale_for_matching is True
    assert snap.matching_ineligible_reason == REASON_OFFLINE
    db.close()


def test_gps_recovery_restores_eligibility() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _set_location(db, driver, age_seconds=LOCATION_MAX_AGE_SECONDS + 20)
    stale = evaluate_driver_matching_eligibility(db, driver)
    assert stale.matching_eligible is False
    _set_location(db, driver, age_seconds=1)
    recovered = evaluate_driver_matching_eligibility(db, driver)
    assert recovered.matching_eligible is True
    assert recovered.location_stale_for_matching is False
    assert recovered.matching_ineligible_reason is None
    db.close()


def test_age_boundary_on_shared_evaluator() -> None:
    db = _make_db()
    driver = _create_driver(db)
    now = datetime(2026, 10, 27, 15, 0, tzinfo=timezone.utc)
    loc = DriverLocation(
        driver_id=driver.user_id,
        lat=38.7,
        lng=-9.1,
        timestamp=now - timedelta(seconds=LOCATION_MAX_AGE_SECONDS),
    )
    db.add(loc)
    db.commit()
    at_limit = evaluate_driver_matching_eligibility(db, driver, now=now)
    assert at_limit.matching_eligible is True
    assert at_limit.location_stale_for_matching is False

    loc.timestamp = now - timedelta(seconds=LOCATION_MAX_AGE_SECONDS, microseconds=1000)
    db.commit()
    over = evaluate_driver_matching_eligibility(db, driver, now=now)
    assert over.matching_eligible is False
    assert over.location_stale_for_matching is True
    assert over.matching_ineligible_reason == REASON_LOCATION_STALE
    db.close()


def test_active_trip_with_stale_gps_is_preserved() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=True)
    passenger = _create_user(db, Role.passenger)
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.user_id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()
    _set_location(db, driver, age_seconds=LOCATION_MAX_AGE_SECONDS + 30)
    _override(db, driver.user_id)
    client = TestClient(app)
    response = client.get("/driver/status")
    assert response.status_code == 200
    body = response.json()
    assert body["is_available"] is True
    assert body["matching_eligible"] is False
    assert body["location_stale_for_matching"] is True
    assert body["matching_ineligible_reason"] == REASON_LOCATION_STALE
    db.refresh(trip)
    db.refresh(driver)
    assert trip.status == TripStatus.accepted
    assert driver.is_available is True
    _reset()
    db.close()


def test_get_status_keeps_legacy_is_available_and_online_body() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=False)
    _override(db, driver.user_id)
    client = TestClient(app)
    status_response = client.get("/driver/status")
    assert status_response.status_code == 200
    body = status_response.json()
    assert body["is_available"] is False
    assert isinstance(body["is_available"], bool)
    assert "matching_eligible" in body
    assert "gps_fix_age_seconds" in body
    assert "location_stale_for_matching" in body
    assert "matching_ineligible_reason" in body

    driver.documents = documents_blob_with_status("approved")
    driver.is_available = False
    db.commit()
    online = client.post("/driver/status/online")
    assert online.status_code == 200
    assert set(online.json()) == {"status", "is_available"}
    _reset()
    db.close()


def test_fresh_gps_still_ineligible_when_documents_or_vehicle_block_offers() -> None:
    db = _make_db()
    incomplete = _create_driver(
        db, documents=documents_blob_with_status("missing")
    )
    _set_location(db, incomplete, age_seconds=2)
    docs = evaluate_driver_matching_eligibility(db, incomplete)
    assert docs.matching_eligible is False
    assert docs.matching_ineligible_reason == "driver_documents_incomplete"
    assert docs.location_stale_for_matching is False

    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"EL-{uuid.uuid4().hex[:6].upper()}",
        plate_normalized=f"EL{uuid.uuid4().hex[:10].upper()}",
        make="Test",
        model="Car",
        status="inactive",
    )
    db.add(vehicle)
    db.flush()
    blocked = _create_driver(db, active_vehicle_id=vehicle.id)
    _set_location(db, blocked, age_seconds=2)
    vehicle_snap = evaluate_driver_matching_eligibility(db, blocked)
    assert vehicle_snap.matching_eligible is False
    assert vehicle_snap.matching_ineligible_reason == "vehicle_inactive"
    db.refresh(blocked)
    assert blocked.is_available is True
    db.close()


def test_unapproved_driver_is_not_matching_eligible() -> None:
    db = _make_db()
    driver = _create_driver(db, status=DriverStatus.pending)
    _set_location(db, driver, age_seconds=1)
    snap = evaluate_driver_matching_eligibility(db, driver)
    assert snap.matching_eligible is False
    assert snap.matching_ineligible_reason == REASON_DRIVER_NOT_APPROVED
    db.close()


def test_dispatch_uses_shared_freshness_predicate(monkeypatch) -> None:
    db = _make_db()
    driver = _create_driver(db)
    _set_location(db, driver, age_seconds=1)
    passenger = _create_user(db, Role.passenger)
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()

    calls = {"n": 0}

    def _reject(*_args, **_kwargs) -> bool:
        calls["n"] += 1
        return False

    monkeypatch.setattr(
        "app.services.offer_dispatch.location_is_fresh_for_matching",
        _reject,
    )
    offers = create_offers_for_trip(db=db, trip=trip)
    assert offers == []
    assert calls["n"] >= 1
    db.refresh(driver)
    assert driver.is_available is True
    db.close()
