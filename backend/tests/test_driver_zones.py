"""Driver zone sessions API (v1 skeleton)."""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.api.deps import UserContext, get_current_user, get_db
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.driver_zone_day_budget import DriverZoneDayBudget
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_zones import (
    create_zone_session,
    maybe_consume_zone_session_on_trip_complete,
    mark_session_arrived,
)


def _make_db() -> Session:
    return SessionLocal()


def _create_driver(db: Session) -> str:
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
        is_available=True,
    )
    db.add(driver)
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


def test_zone_budget_today_defaults() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.get("/driver/zones/budget/today")
        assert r.status_code == 200
        data = r.json()
        assert data["used_changes"] == 0
        assert data["max_changes"] == 2
        assert data["remaining"] == 2
        assert data["timezone"] == "Europe/Lisbon"
        assert "service_date" in data
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_create_and_conflict_open() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r1 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "portimao", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r1.status_code == 201
        body = r1.json()
        assert body["zone_id"] == "portimao"
        assert body["status"] == "open"

        r2 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 300, "eta_margin_percent": 10},
        )
        assert r2.status_code == 409
        assert r2.json()["detail"] == "zone_session_already_open"
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_budget_exhausted() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    uid = uuid.UUID(driver_id)
    sd = date.today()
    db.add(
        DriverZoneDayBudget(
            driver_id=uid,
            service_date=sd,
            used_changes_count=2,
            max_changes_count=2,
            timezone="Europe/Lisbon",
        )
    )
    db.commit()

    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "lisboa", "eta_seconds_baseline": 120, "eta_margin_percent": 0},
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "zone_change_budget_exhausted"
    finally:
        _reset_overrides()
        db.close()


def _create_passenger(db: Session) -> uuid.UUID:
    user = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3518{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def test_zone_session_arrived() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "portimao", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        r1 = client.post(f"/driver/zones/sessions/{sid}/arrived")
        assert r1.status_code == 200
        assert r1.json()["arrived_at"] is not None
        r2 = client.post(f"/driver/zones/sessions/{sid}/arrived")
        assert r2.status_code == 200
        assert r2.json()["arrived_at"] == r1.json()["arrived_at"]
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_cancel_then_new_session() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 400, "eta_margin_percent": 10},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        rc = client.post(f"/driver/zones/sessions/{sid}/cancel", json={})
        assert rc.status_code == 200
        assert rc.json()["status"] == "cancelled"

        r1 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "lisboa", "eta_seconds_baseline": 300, "eta_margin_percent": 0},
        )
        assert r1.status_code == 201
        assert r1.json()["status"] == "open"
    finally:
        _reset_overrides()
        db.close()


def test_maybe_consume_first_completed_after_arrived() -> None:
    db = _make_db()
    driver_id_str = _create_driver(db)
    driver_uuid = uuid.UUID(driver_id_str)
    passenger_id = _create_passenger(db)

    sess = create_zone_session(
        db,
        driver_id=driver_uuid,
        zone_id="portimao",
        eta_seconds_baseline=600,
        eta_margin_percent=25,
    )
    mark_session_arrived(db, driver_id=driver_uuid, session_id=sess.id)
    t_arrived = datetime(2025, 6, 1, 8, 0, 0, tzinfo=timezone.utc)
    sess.arrived_at = t_arrived
    db.commit()

    t0 = datetime(2025, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
    trip = Trip(
        passenger_id=passenger_id,
        driver_id=driver_uuid,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        completed_at=t0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    maybe_consume_zone_session_on_trip_complete(
        db,
        driver_id=driver_uuid,
        trip_id=trip.id,
        trip_completed_at=t0,
    )
    db.commit()

    db.refresh(sess)
    assert sess.status == "consumed"
    assert sess.first_completed_trip_id == trip.id
    assert sess.consume_reason == "completed_trip"

    sd = sess.started_at.astimezone(ZoneInfo("Europe/Lisbon")).date()
    row = db.get(DriverZoneDayBudget, (driver_uuid, sd))
    assert row is not None
    assert row.used_changes_count == 1

    db.close()


def test_maybe_consume_only_first_chronological_completed() -> None:
    db = _make_db()
    driver_id_str = _create_driver(db)
    driver_uuid = uuid.UUID(driver_id_str)
    passenger_id = _create_passenger(db)

    sess = create_zone_session(
        db,
        driver_id=driver_uuid,
        zone_id="faro",
        eta_seconds_baseline=500,
        eta_margin_percent=10,
    )
    mark_session_arrived(db, driver_id=driver_uuid, session_id=sess.id)
    sess.arrived_at = datetime(2025, 6, 2, 7, 0, 0, tzinfo=timezone.utc)
    db.commit()

    t_early = datetime(2025, 6, 2, 8, 0, 0, tzinfo=timezone.utc)
    t_late = datetime(2025, 6, 2, 9, 0, 0, tzinfo=timezone.utc)
    trip_a = Trip(
        passenger_id=passenger_id,
        driver_id=driver_uuid,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        completed_at=t_early,
    )
    trip_b = Trip(
        passenger_id=passenger_id,
        driver_id=driver_uuid,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=11.0,
        completed_at=t_late,
    )
    db.add(trip_a)
    db.add(trip_b)
    db.commit()
    db.refresh(trip_a)
    db.refresh(trip_b)

    maybe_consume_zone_session_on_trip_complete(
        db,
        driver_id=driver_uuid,
        trip_id=trip_b.id,
        trip_completed_at=t_late,
    )
    db.commit()
    db.refresh(sess)
    assert sess.status == "open"
    assert sess.first_completed_trip_id is None

    maybe_consume_zone_session_on_trip_complete(
        db,
        driver_id=driver_uuid,
        trip_id=trip_a.id,
        trip_completed_at=t_early,
    )
    db.commit()
    db.refresh(sess)
    assert sess.status == "consumed"
    assert sess.first_completed_trip_id == trip_a.id

    db.close()


def test_maybe_consume_ignores_completed_trips_before_arrived() -> None:
    db = _make_db()
    driver_id_str = _create_driver(db)
    driver_uuid = uuid.UUID(driver_id_str)
    passenger_id = _create_passenger(db)

    sess = create_zone_session(
        db,
        driver_id=driver_uuid,
        zone_id="lisboa",
        eta_seconds_baseline=400,
        eta_margin_percent=5,
    )
    mark_session_arrived(db, driver_id=driver_uuid, session_id=sess.id)
    arrived = datetime(2025, 6, 3, 12, 0, 0, tzinfo=timezone.utc)
    sess.arrived_at = arrived
    db.commit()

    trip_old = Trip(
        passenger_id=passenger_id,
        driver_id=driver_uuid,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        completed_at=arrived - timedelta(hours=1),
    )
    trip_new = Trip(
        passenger_id=passenger_id,
        driver_id=driver_uuid,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=12.0,
        completed_at=arrived + timedelta(hours=1),
    )
    db.add(trip_old)
    db.add(trip_new)
    db.commit()
    db.refresh(trip_new)

    maybe_consume_zone_session_on_trip_complete(
        db,
        driver_id=driver_uuid,
        trip_id=trip_new.id,
        trip_completed_at=trip_new.completed_at,
    )
    db.commit()
    db.refresh(sess)
    assert sess.status == "consumed"
    assert sess.first_completed_trip_id == trip_new.id

    db.close()
