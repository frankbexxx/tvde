"""G2-DRV-GPS-09C: fix-v1 timestamp contract, legacy clients unchanged."""

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
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.driver_location import GPS_CONTRACT_FIX_V1, upsert_driver_location
from tests.support.unique_phone import unique_test_phone

FIX_V1 = {"X-Gps-Contract": GPS_CONTRACT_FIX_V1}


def _make_db() -> Session:
    return SessionLocal()


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _epoch_ms(ts: datetime) -> int:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return int(round(ts.timestamp() * 1000))


def _create_driver(db: Session) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver GPS09C {uuid.uuid4()}",
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
        is_available=True,
    )
    db.add(driver)
    db.commit()
    return str(user.id)


def _override(db: Session, user_ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset() -> None:
    app.dependency_overrides.clear()


def _stored(db: Session, driver_id: str) -> DriverLocation:
    db.expire_all()
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == uuid.UUID(driver_id))
    ).scalar_one()
    return loc


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


def test_legacy_client_still_204_and_overwrites() -> None:
    """C6: a later legacy timestamp still advances; an older one is a 204 no-op."""
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    newer = _now_ms()
    first = _post(client, lat=40.0, lng=-8.0, timestamp_ms=newer)
    assert first.status_code == 204
    assert first.content == b""

    older = newer - 5_000
    second = _post(client, lat=41.0, lng=-8.5, timestamp_ms=older)
    assert second.status_code == 204
    assert second.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 40.0
    assert float(loc.lng) == -8.0
    assert _epoch_ms(loc.timestamp) == newer

    later = newer + 1_000
    third = _post(client, lat=40.4, lng=-8.4, timestamp_ms=later)
    assert third.status_code == 204
    assert third.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 40.4
    assert float(loc.lng) == -8.4
    assert _epoch_ms(loc.timestamp) == later

    _reset()
    db.close()


def test_fix_v1_new_fix_updates() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    ts = _now_ms()
    r = _post(client, lat=38.72, lng=-9.14, timestamp_ms=ts, headers=FIX_V1)
    assert r.status_code == 204
    assert r.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.72
    assert float(loc.lng) == -9.14
    assert _epoch_ms(loc.timestamp) == ts

    _reset()
    db.close()


def test_fix_v1_duplicate_is_noop() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    ts = _now_ms()
    assert _post(client, lat=38.7, lng=-9.1, timestamp_ms=ts, headers=FIX_V1).status_code == 204
    again = _post(client, lat=40.5, lng=-8.2, timestamp_ms=ts, headers=FIX_V1)
    assert again.status_code == 204
    assert again.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.7
    assert float(loc.lng) == -9.1
    assert _epoch_ms(loc.timestamp) == ts

    _reset()
    db.close()


def test_fix_v1_older_fix_does_not_replace() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    newer = _now_ms()
    older = newer - 8_000
    assert _post(
        client, lat=38.71, lng=-9.13, timestamp_ms=newer, headers=FIX_V1
    ).status_code == 204
    stale = _post(client, lat=41.15, lng=-8.61, timestamp_ms=older, headers=FIX_V1)
    assert stale.status_code == 204
    assert stale.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.71
    assert float(loc.lng) == -9.13
    assert _epoch_ms(loc.timestamp) == newer

    _reset()
    db.close()


def test_fix_v1_same_coordinates_newer_timestamp_advances() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    first = _now_ms() - 2_000
    second = first + 2_000
    assert _post(
        client, lat=38.7, lng=-9.1, timestamp_ms=first, headers=FIX_V1
    ).status_code == 204
    advanced = _post(client, lat=38.7, lng=-9.1, timestamp_ms=second, headers=FIX_V1)
    assert advanced.status_code == 204
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.7
    assert float(loc.lng) == -9.1
    assert _epoch_ms(loc.timestamp) == second

    _reset()
    db.close()


def test_fix_v1_rejects_excessive_future() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    future = int((datetime.now(timezone.utc) + timedelta(seconds=120)).timestamp() * 1000)
    r = _post(client, lat=38.7, lng=-9.1, timestamp_ms=future, headers=FIX_V1)
    assert r.status_code == 400
    assert r.json()["detail"] == "gps_fix_timestamp_in_future"
    missing = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == uuid.UUID(driver_id))
    ).scalar_one_or_none()
    assert missing is None

    _reset()
    db.close()


def test_fix_v1_rejects_excessive_past() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    too_old = int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp() * 1000)
    r = _post(client, lat=38.7, lng=-9.1, timestamp_ms=too_old, headers=FIX_V1)
    assert r.status_code == 400
    assert r.json()["detail"] == "gps_fix_timestamp_too_old"

    _reset()
    db.close()


def test_fix_v1_alias_path() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    ts = _now_ms()
    r = client.post(
        "/driver/location",
        json={"lat": 38.8, "lng": -9.2, "timestamp": ts},
        headers=FIX_V1,
    )
    assert r.status_code == 204
    assert r.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.8

    _reset()
    db.close()


def test_concurrent_fix_v1_posts_keep_newest() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    db.close()

    newer_ms = _now_ms()
    older_ms = newer_ms - 4_000
    barrier = threading.Barrier(2)
    errors: list[BaseException] = []

    def _send(timestamp_ms: int, lat: float, lng: float) -> None:
        sess = SessionLocal()
        try:
            barrier.wait(timeout=10)
            upsert_driver_location(
                db=sess,
                driver_id=driver_id,
                lat=lat,
                lng=lng,
                timestamp_ms=timestamp_ms,
                gps_contract=GPS_CONTRACT_FIX_V1,
            )
        except BaseException as exc:
            errors.append(exc)
        finally:
            sess.close()

    older = threading.Thread(target=_send, args=(older_ms, 40.1, -8.1))
    newer = threading.Thread(target=_send, args=(newer_ms, 41.2, -8.2))
    older.start()
    newer.start()
    older.join(timeout=20)
    newer.join(timeout=20)

    assert not errors, errors
    check = _make_db()
    try:
        loc = _stored(check, driver_id)
        assert float(loc.lat) == 41.2
        assert float(loc.lng) == -8.2
        assert _epoch_ms(loc.timestamp) == newer_ms
    finally:
        check.close()


def test_c1_legacy_after_fix_v1_does_not_regress() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    fix_ms = _now_ms()
    assert (
        _post(client, lat=38.71, lng=-9.13, timestamp_ms=fix_ms, headers=FIX_V1).status_code
        == 204
    )
    legacy = _post(client, lat=41.15, lng=-8.61, timestamp_ms=fix_ms - 8_000)
    assert legacy.status_code == 204
    assert legacy.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.71
    assert float(loc.lng) == -9.13
    assert _epoch_ms(loc.timestamp) == fix_ms
    _reset()
    db.close()


def test_c2_legacy_newer_clock_after_fix_v1_updates() -> None:
    """Old APK heartbeats use Date.now(), which is newer than the stored fix."""
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    fix_ms = _now_ms() - 3_000
    assert (
        _post(client, lat=38.70, lng=-9.10, timestamp_ms=fix_ms, headers=FIX_V1).status_code
        == 204
    )
    sent_ms = _now_ms()
    legacy = _post(client, lat=38.80, lng=-9.20, timestamp_ms=sent_ms)
    assert legacy.status_code == 204
    assert legacy.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.80
    assert float(loc.lng) == -9.20
    assert _epoch_ms(loc.timestamp) == sent_ms
    _reset()
    db.close()


def test_c4_second_legacy_timestamp_advances() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    first = _now_ms() - 2_000
    second = first + 2_000
    assert _post(client, lat=38.1, lng=-9.1, timestamp_ms=first).status_code == 204
    assert _post(client, lat=38.2, lng=-9.2, timestamp_ms=second).status_code == 204
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.2
    assert float(loc.lng) == -9.2
    assert _epoch_ms(loc.timestamp) == second
    _reset()
    db.close()


def test_c5_legacy_duplicate_timestamp_is_noop() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    ts = _now_ms()
    assert _post(client, lat=38.3, lng=-9.3, timestamp_ms=ts).status_code == 204
    again = _post(client, lat=40.9, lng=-8.9, timestamp_ms=ts)
    assert again.status_code == 204
    assert again.content == b""
    loc = _stored(db, driver_id)
    assert float(loc.lat) == 38.3
    assert float(loc.lng) == -9.3
    assert _epoch_ms(loc.timestamp) == ts
    _reset()
    db.close()


def _race(
    driver_id: str,
    left: tuple[int, float, float, str | None],
    right: tuple[int, float, float, str | None],
) -> tuple[float, float, int]:
    barrier = threading.Barrier(2)
    errors: list[BaseException] = []

    def _send(timestamp_ms: int, lat: float, lng: float, contract: str | None) -> None:
        sess = SessionLocal()
        try:
            barrier.wait(timeout=10)
            upsert_driver_location(
                db=sess,
                driver_id=driver_id,
                lat=lat,
                lng=lng,
                timestamp_ms=timestamp_ms,
                gps_contract=contract,
            )
        except BaseException as exc:
            errors.append(exc)
        finally:
            sess.close()

    threads = [
        threading.Thread(target=_send, args=item) for item in (left, right)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=20)
    assert not errors, errors
    check = _make_db()
    try:
        loc = _stored(check, driver_id)
        return float(loc.lat), float(loc.lng), _epoch_ms(loc.timestamp)
    finally:
        check.close()


def test_c3_concurrent_legacy_and_fix_v1_keep_newest() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    db.close()
    newer_ms = _now_ms()
    older_ms = newer_ms - 4_000

    fix_lat, fix_lng, fix_ts = _race(
        driver_id,
        (older_ms, 40.1, -8.1, None),
        (newer_ms, 41.2, -8.2, GPS_CONTRACT_FIX_V1),
    )
    assert fix_lat == 41.2
    assert fix_lng == -8.2
    assert fix_ts == newer_ms

    db = _make_db()
    driver_id = _create_driver(db)
    db.close()
    newer_ms = _now_ms()
    older_ms = newer_ms - 4_000
    legacy_lat, legacy_lng, legacy_ts = _race(
        driver_id,
        (newer_ms, 42.0, -8.0, None),
        (older_ms, 39.0, -9.0, GPS_CONTRACT_FIX_V1),
    )
    assert legacy_lat == 42.0
    assert legacy_lng == -8.0
    assert legacy_ts == newer_ms
