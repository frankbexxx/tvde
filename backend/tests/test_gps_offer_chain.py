"""G2-DRV-GPS-09F: fix GPS → API → PostgreSQL → matching → GET /driver/status.

O relógio dos testes é o timestamp do fix. Não há espera real de 45 s.
"""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timedelta, timezone

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
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_location import GPS_CONTRACT_FIX_V1
from app.services.offer_dispatch import create_offers_for_trip
from tests.support.unique_phone import unique_test_phone

FIX_V1 = {"X-Gps-Contract": GPS_CONTRACT_FIX_V1}
ORIGIN = (38.7221, -9.1392)


def _make_db() -> Session:
    return SessionLocal()


def _epoch_ms(ts: datetime) -> int:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return int(round(ts.timestamp() * 1000))


def _fix_ms(*, age_seconds: float) -> int:
    moment = datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
    return int(moment.timestamp() * 1000)


def _create_driver(db: Session, *, is_available: bool = True) -> Driver:
    user = User(
        role=Role.driver,
        name=f"Driver GPS09F {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
        is_available=is_available,
        vehicle_categories="x",
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


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


def _override_user_only(user_id: uuid.UUID) -> None:
    async def override_user() -> UserContext:
        return UserContext(user_id=str(user_id), role=Role.driver)

    app.dependency_overrides[get_current_user] = override_user


def _reset() -> None:
    app.dependency_overrides.clear()


def _post(
    client: TestClient,
    *,
    lat: float,
    lng: float,
    timestamp_ms: int,
    headers: dict[str, str] | None = None,
):
    return client.post(
        "/drivers/location",
        json={"lat": lat, "lng": lng, "timestamp": timestamp_ms},
        headers=headers,
    )


def _stored(db: Session, driver: Driver) -> DriverLocation | None:
    db.expire_all()
    return db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver.user_id)
    ).scalar_one_or_none()


def _status(client: TestClient) -> dict:
    response = client.get("/driver/status")
    assert response.status_code == 200
    return response.json()


def _requested_trip(db: Session) -> Trip:
    passenger = User(
        role=Role.passenger,
        name=f"Passenger GPS09F {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=ORIGIN[0],
        origin_lng=ORIGIN[1],
        destination_lat=ORIGIN[0] + 0.02,
        destination_lng=ORIGIN[1] + 0.02,
        estimated_price=10.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _offer_for(db: Session, trip: Trip, driver: Driver) -> TripOffer | None:
    db.expire_all()
    return db.execute(
        select(TripOffer).where(
            TripOffer.trip_id == trip.id,
            TripOffer.driver_id == driver.user_id,
        )
    ).scalar_one_or_none()


def _matching_includes(db: Session, driver: Driver) -> bool:
    trip = _requested_trip(db)
    create_offers_for_trip(db=db, trip=trip)
    return _offer_for(db, trip, driver) is not None


def test_f1_online_recent_fix_is_eligible_and_matched() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    sent = _fix_ms(age_seconds=5)
    posted = _post(client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=sent, headers=FIX_V1)
    assert posted.status_code == 204
    loc = _stored(db, driver)
    assert loc is not None
    assert _epoch_ms(loc.timestamp) == sent
    body = _status(client)
    assert body["is_available"] is True
    assert body["matching_eligible"] is True
    assert body["matching_ineligible_reason"] is None
    assert _matching_includes(db, driver) is True
    _reset()
    db.close()


def test_f2_stationary_driver_stays_eligible_when_a_new_fix_arrives() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    first = _fix_ms(age_seconds=8)
    second = _fix_ms(age_seconds=2)
    assert _post(
        client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=first, headers=FIX_V1
    ).status_code == 204
    assert _post(
        client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=second, headers=FIX_V1
    ).status_code == 204
    loc = _stored(db, driver)
    assert loc is not None
    assert float(loc.lat) == ORIGIN[0]
    assert float(loc.lng) == ORIGIN[1]
    assert _epoch_ms(loc.timestamp) == second
    body = _status(client)
    assert body["matching_eligible"] is True
    assert _matching_includes(db, driver) is True
    _reset()
    db.close()


def test_f3_no_new_fix_past_45s_excludes_matching_and_stays_online() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    sent = _fix_ms(age_seconds=50)
    assert _post(
        client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=sent, headers=FIX_V1
    ).status_code == 204
    loc = _stored(db, driver)
    assert loc is not None
    assert _epoch_ms(loc.timestamp) == sent
    body = _status(client)
    assert body["is_available"] is True
    assert body["matching_eligible"] is False
    assert body["location_stale_for_matching"] is True
    assert body["matching_ineligible_reason"] == "location_stale"
    assert body["gps_fix_age_seconds"] > 45
    db.refresh(driver)
    assert driver.is_available is True
    assert _matching_includes(db, driver) is False
    _reset()
    db.close()


def test_f4_missing_location_is_ineligible() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    assert _stored(db, driver) is None
    body = _status(client)
    assert body["is_available"] is True
    assert body["matching_eligible"] is False
    assert body["matching_ineligible_reason"] == "location_missing"
    assert body["gps_fix_age_seconds"] is None
    assert _matching_includes(db, driver) is False
    _reset()
    db.close()


def test_f5_new_fix_after_stale_restores_eligibility() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    stale = _fix_ms(age_seconds=50)
    assert _post(
        client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=stale, headers=FIX_V1
    ).status_code == 204
    assert _status(client)["matching_ineligible_reason"] == "location_stale"
    fresh = _fix_ms(age_seconds=2)
    assert _post(
        client, lat=ORIGIN[0] + 0.001, lng=ORIGIN[1], timestamp_ms=fresh, headers=FIX_V1
    ).status_code == 204
    loc = _stored(db, driver)
    assert loc is not None
    assert _epoch_ms(loc.timestamp) == fresh
    body = _status(client)
    assert body["matching_eligible"] is True
    assert body["matching_ineligible_reason"] is None
    assert body["location_stale_for_matching"] is False
    assert _matching_includes(db, driver) is True
    _reset()
    db.close()


def test_f6_duplicate_or_older_fix_does_not_refresh() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    original = _fix_ms(age_seconds=50)
    assert _post(
        client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=original, headers=FIX_V1
    ).status_code == 204
    duplicate = _post(
        client, lat=41.15, lng=-8.61, timestamp_ms=original, headers=FIX_V1
    )
    older = _post(
        client, lat=40.2, lng=-8.2, timestamp_ms=original - 5_000, headers=FIX_V1
    )
    assert duplicate.status_code == 204
    assert older.status_code == 204
    loc = _stored(db, driver)
    assert loc is not None
    assert float(loc.lat) == ORIGIN[0]
    assert float(loc.lng) == ORIGIN[1]
    assert _epoch_ms(loc.timestamp) == original
    body = _status(client)
    assert body["matching_eligible"] is False
    assert body["matching_ineligible_reason"] == "location_stale"
    assert _matching_includes(db, driver) is False
    _reset()
    db.close()


def test_f7_concurrent_posts_keep_the_newer_fix() -> None:
    db = _make_db()
    driver = _create_driver(db)
    user_id = driver.user_id
    db.close()
    _override_user_only(user_id)
    newer = _fix_ms(age_seconds=2)
    older = newer - 4_000
    barrier = threading.Barrier(2)
    errors: list[BaseException] = []

    def _send(timestamp_ms: int, lat: float, lng: float) -> None:
        try:
            barrier.wait(timeout=10)
            with TestClient(app) as client:
                response = _post(
                    client, lat=lat, lng=lng, timestamp_ms=timestamp_ms, headers=FIX_V1
                )
                assert response.status_code == 204
        except BaseException as exc:
            errors.append(exc)

    threads = [
        threading.Thread(target=_send, args=(older, 40.1, -8.1)),
        threading.Thread(target=_send, args=(newer, 41.2, -8.2)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=20)
    _reset()
    assert not errors, errors
    check = _make_db()
    try:
        loc = check.execute(
            select(DriverLocation).where(DriverLocation.driver_id == user_id)
        ).scalar_one()
        assert float(loc.lat) == 41.2
        assert float(loc.lng) == -8.2
        assert _epoch_ms(loc.timestamp) == newer
    finally:
        check.close()


def test_f8_stale_gps_does_not_cancel_the_active_trip() -> None:
    db = _make_db()
    driver = _create_driver(db)
    passenger = User(
        role=Role.passenger,
        name=f"Passenger GPS09F trip {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.user_id,
        status=TripStatus.accepted,
        origin_lat=ORIGIN[0],
        origin_lng=ORIGIN[1],
        destination_lat=ORIGIN[0] + 0.02,
        destination_lng=ORIGIN[1] + 0.02,
        estimated_price=12.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()
    _override(db, driver.user_id)
    client = TestClient(app)
    assert _post(
        client,
        lat=ORIGIN[0],
        lng=ORIGIN[1],
        timestamp_ms=_fix_ms(age_seconds=50),
        headers=FIX_V1,
    ).status_code == 204
    body = _status(client)
    assert body["is_available"] is True
    assert body["matching_ineligible_reason"] == "location_stale"
    db.refresh(trip)
    db.refresh(driver)
    assert trip.status == TripStatus.accepted
    assert driver.is_available is True
    _reset()
    db.close()


def test_f9_offline_driver_with_recent_gps_is_ineligible() -> None:
    db = _make_db()
    driver = _create_driver(db, is_available=False)
    _override(db, driver.user_id)
    client = TestClient(app)
    assert _post(
        client,
        lat=ORIGIN[0],
        lng=ORIGIN[1],
        timestamp_ms=_fix_ms(age_seconds=3),
        headers=FIX_V1,
    ).status_code == 204
    body = _status(client)
    assert body["is_available"] is False
    assert body["matching_eligible"] is False
    assert body["matching_ineligible_reason"] == "offline"
    db.refresh(driver)
    assert driver.is_available is False
    assert _matching_includes(db, driver) is False
    _reset()
    db.close()


def test_f10_legacy_client_without_header_stays_compatible() -> None:
    db = _make_db()
    driver = _create_driver(db)
    _override(db, driver.user_id)
    client = TestClient(app)
    sent = _fix_ms(age_seconds=10)
    posted = _post(client, lat=ORIGIN[0], lng=ORIGIN[1], timestamp_ms=sent)
    assert posted.status_code == 204
    assert posted.headers.get("x-gps-contract") is None
    loc = _stored(db, driver)
    assert loc is not None
    assert _epoch_ms(loc.timestamp) == sent
    body = _status(client)
    assert body["matching_eligible"] is True
    assert body["matching_ineligible_reason"] is None
    assert _matching_includes(db, driver) is True
    _reset()
    db.close()
