"""Driver zone sessions API (v1 skeleton)."""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.api.deps import UserContext, get_current_user, get_db
from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.driver_zone_day_budget import DriverZoneDayBudget
from app.db.models.driver_zone_session import DriverZoneSession
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_zones import (
    create_zone_session,
    expire_open_zone_sessions_past_deadline,
    maybe_consume_zone_session_on_trip_complete,
    mark_session_arrived,
    request_zone_session_extension,
)


def _make_db() -> Session:
    return SessionLocal()


def _set_driver_location(db: Session, driver_id: uuid.UUID, lat: float, lng: float) -> None:
    loc = db.get(DriverLocation, driver_id)
    if loc is None:
        db.add(DriverLocation(driver_id=driver_id, lat=lat, lng=lng))
    else:
        loc.lat = lat
        loc.lng = lng
    db.commit()


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


def test_zone_catalog_lists_known_zones() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.get("/driver/zones/catalog")
        assert r.status_code == 200
        data = r.json()
        ids = {z["zone_id"] for z in data["zones"]}
        assert "portimao" in ids
        assert "faro" in ids
        assert "lisboa" in ids
        assert "lis" in ids
        lis = next(z for z in data["zones"] if z["zone_id"] == "lis")
        assert lis["kind"] == "airport"
        assert lis.get("ops_note_pt")
        faro = next(z for z in data["zones"] if z["zone_id"] == "faro")
        assert faro.get("ops_note_pt") is None
        assert faro.get("arrived_anchor_lat") is not None
        assert faro.get("arrived_anchor_lng") is not None
        assert faro.get("arrived_max_km") is not None
    finally:
        _reset_overrides()
        db.close()


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


def test_driver_custom_zones_crud() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.get("/driver/zones/custom-zones")
        assert r0.status_code == 200
        assert r0.json()["zones"] == []

        r1 = client.post("/driver/zones/custom-zones", json={"zone_id": " LISBOA-NORTE "})
        assert r1.status_code == 201
        assert r1.json()["zone_id"] == "lisboa-norte"

        r2 = client.post("/driver/zones/custom-zones", json={"zone_id": "lisboa-norte"})
        assert r2.status_code == 201
        assert r2.json()["zone_id"] == "lisboa-norte"

        r3 = client.get("/driver/zones/custom-zones")
        assert r3.status_code == 200
        zones = r3.json()["zones"]
        assert len(zones) == 1
        assert zones[0]["zone_id"] == "lisboa-norte"

        r4 = client.delete("/driver/zones/custom-zones/lisboa-norte")
        assert r4.status_code == 200
        assert r4.json()["ok"] is True

        r5 = client.delete("/driver/zones/custom-zones/lisboa-norte")
        assert r5.status_code == 404
        assert r5.json()["detail"] == "custom_zone_not_found"
    finally:
        _reset_overrides()
        db.close()


def test_driver_custom_zone_rejects_catalog_slug() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/driver/zones/custom-zones", json={"zone_id": "lisboa"})
        assert r.status_code == 409
        assert r.json()["detail"] == "custom_zone_conflicts_catalog"
    finally:
        _reset_overrides()
        db.close()


def test_driver_custom_zone_rejects_when_limit_reached() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    uid = uuid.UUID(driver_id)
    for i in range(30):
        db.execute(
            text(
                "INSERT INTO driver_zone_customs (id, driver_id, zone_id) "
                "VALUES (:id, :driver_id, :zone_id)"
            ),
            {
                "id": str(uuid.uuid4()),
                "driver_id": str(uid),
                "zone_id": f"custom-{i}",
            },
        )
    db.commit()
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/driver/zones/custom-zones", json={"zone_id": "custom-overflow"})
        assert r.status_code == 409
        assert r.json()["detail"] == "custom_zone_limit_reached"
    finally:
        _reset_overrides()
        db.close()


def test_zone_eta_estimate_ok() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _set_driver_location(db, uuid.UUID(driver_id), 38.7223, -9.1393)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/driver/zones/eta-estimate", json={"zone_id": "lisboa"})
        assert r.status_code == 200
        data = r.json()
        assert data["zone_id"] == "lisboa"
        assert data["source"] == "server_haversine"
        assert data["eta_seconds_baseline"] > 0
        assert data["distance_km"] >= 0
    finally:
        _reset_overrides()
        db.close()


def test_zone_eta_estimate_requires_driver_location() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/driver/zones/eta-estimate", json={"zone_id": "lisboa"})
        assert r.status_code == 400
        assert r.json()["detail"] == "driver_location_required_for_zone_eta"
    finally:
        _reset_overrides()
        db.close()


def test_zone_eta_estimate_rejects_unknown_anchor() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _set_driver_location(db, uuid.UUID(driver_id), 38.7223, -9.1393)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/driver/zones/eta-estimate", json={"zone_id": "zona_custom_sem_ancora"})
        assert r.status_code == 400
        assert r.json()["detail"] == "zone_eta_anchor_not_available"
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


def test_zone_session_create_normalizes_zone_id_lowercase() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r1 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": " LISBOA ", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r1.status_code == 201
        body = r1.json()
        assert body["zone_id"] == "lisboa"
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
    _set_driver_location(db, uuid.UUID(driver_id), 37.1370, -8.5360)
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


def test_zone_session_arrived_rejects_without_driver_location() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        r1 = client.post(f"/driver/zones/sessions/{sid}/arrived")
        assert r1.status_code == 400
        assert r1.json()["detail"] == "driver_location_required_for_zone_arrived"
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_arrived_rejects_when_too_far_from_anchor() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    # Porto area — well outside Faro gate
    _set_driver_location(db, uuid.UUID(driver_id), 41.1579, -8.6291)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        r1 = client.post(f"/driver/zones/sessions/{sid}/arrived")
        assert r1.status_code == 400
        assert r1.json()["detail"] == "driver_outside_zone_for_arrived"
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_arrived_skips_geo_for_unknown_zone_slug() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "custom_partner_zone_x", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        r1 = client.post(f"/driver/zones/sessions/{sid}/arrived")
        assert r1.status_code == 200
        assert r1.json()["arrived_at"] is not None
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
    _set_driver_location(db, driver_uuid, 37.1370, -8.5360)
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
    _set_driver_location(db, driver_uuid, 37.0193, -7.9323)
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
    _set_driver_location(db, driver_uuid, 38.7223, -9.1393)
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


def test_expire_open_zone_sessions_past_deadline() -> None:
    db = _make_db()
    driver_id_str = _create_driver(db)
    driver_uuid = uuid.UUID(driver_id_str)
    t_now = datetime(2025, 6, 10, 14, 0, 0, tzinfo=timezone.utc)
    past_deadline = t_now - timedelta(hours=1)
    sess = DriverZoneSession(
        driver_id=driver_uuid,
        zone_id="lisboa",
        started_at=past_deadline - timedelta(hours=2),
        eta_seconds_baseline=3600,
        eta_margin_percent=0,
        deadline_at=past_deadline,
        status="open",
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)

    n = expire_open_zone_sessions_past_deadline(db, now=t_now)
    assert n == 1
    db.refresh(sess)
    assert sess.status == "expired"
    assert sess.cancel_reason == "deadline_passed"
    db.close()


def test_expire_open_zone_sessions_future_deadline_unchanged() -> None:
    db = _make_db()
    driver_id_str = _create_driver(db)
    driver_uuid = uuid.UUID(driver_id_str)
    t_now = datetime(2025, 6, 11, 10, 0, 0, tzinfo=timezone.utc)
    future_deadline = t_now + timedelta(hours=2)
    sess = DriverZoneSession(
        driver_id=driver_uuid,
        zone_id="portimao",
        started_at=t_now - timedelta(hours=1),
        eta_seconds_baseline=7200,
        eta_margin_percent=0,
        deadline_at=future_deadline,
        status="open",
    )
    db.add(sess)
    db.commit()

    n = expire_open_zone_sessions_past_deadline(db, now=t_now)
    assert n == 0
    db.refresh(sess)
    assert sess.status == "open"
    assert sess.cancel_reason is None
    db.close()


def test_zone_session_open_not_found() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.get("/driver/zones/sessions/open")
        assert r.status_code == 404
        assert r.json()["detail"] == "no_open_zone_session"
    finally:
        _reset_overrides()
        db.close()


def _ensure_default_partner_row(db: Session) -> None:
    if db.get(Partner, DEFAULT_PARTNER_UUID) is None:
        db.add(Partner(id=DEFAULT_PARTNER_UUID, name="Default fleet"))
        db.commit()


def test_zone_session_request_extension_and_partner_approve() -> None:
    db = _make_db()
    _ensure_default_partner_row(db)
    driver_id_str = _create_driver(db)
    u_p = User(
        role=Role.partner,
        name="Zone partner mgr",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
        partner_org_id=DEFAULT_PARTNER_UUID,
    )
    db.add(u_p)
    db.commit()
    partner_user_id_str = str(u_p.id)
    partner_tok = create_access_token(subject=partner_user_id_str, role=Role.partner.value)["token"]

    _override_deps(db, UserContext(user_id=driver_id_str, role=Role.driver))
    client = TestClient(app)
    try:
        r0 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 400, "eta_margin_percent": 10},
        )
        assert r0.status_code == 201
        sid = r0.json()["id"]
        deadline_before = r0.json()["deadline_at"]

        r_bad = client.post(
            f"/driver/zones/sessions/{sid}/request-extension",
            json={"reason": "no"},
        )
        assert r_bad.status_code == 422  # Pydantic: reason min_length=3

        r1 = client.post(
            f"/driver/zones/sessions/{sid}/request-extension",
            json={"reason": "Bloqueio na A2, preciso de mais 10 minutos."},
        )
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["extension_requested"] is True
        assert d1["extension_seconds_approved"] is None

        r_dup = client.post(
            f"/driver/zones/sessions/{sid}/request-extension",
            json={"reason": "Segundo pedido não deve passar."},
        )
        assert r_dup.status_code == 409
        assert r_dup.json()["detail"] == "extension_pending"
    finally:
        _reset_overrides()
        db.close()

    c2 = TestClient(app)
    h = {"Authorization": f"Bearer {partner_tok}"}
    r2 = c2.post(
        f"/partner/drivers/{driver_id_str}/zones/sessions/{sid}/approve-extension",
        json={"extra_seconds": 600},
        headers=h,
    )
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["extension_seconds_approved"] == 600
    assert d2["approved_by_partner_user_id"] == partner_user_id_str
    assert d2["deadline_at"] != deadline_before

    db = _make_db()
    try:
        with pytest.raises(ValueError, match="extension_already_used"):
            request_zone_session_extension(
                db,
                driver_id=uuid.UUID(driver_id_str),
                session_id=uuid.UUID(sid),
                reason="Terceiro pedido na mesma sessão.",
            )
    finally:
        db.close()


def test_partner_approve_extension_wrong_fleet() -> None:
    db = _make_db()
    pid_other = uuid.uuid4()
    db.add(Partner(id=pid_other, name="Other fleet"))
    driver_id_str = _create_driver(db)
    u_p = User(
        role=Role.partner,
        name="Wrong mgr",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
        partner_org_id=pid_other,
    )
    db.add(u_p)
    db.flush()
    sess = create_zone_session(
        db,
        driver_id=uuid.UUID(driver_id_str),
        zone_id="lisboa",
        eta_seconds_baseline=600,
        eta_margin_percent=0,
    )
    request_zone_session_extension(
        db,
        driver_id=uuid.UUID(driver_id_str),
        session_id=sess.id,
        reason="Motivo válido aqui.",
    )
    db.commit()
    sid = str(sess.id)
    partner_tok = create_access_token(subject=str(u_p.id), role=Role.partner.value)["token"]
    db.close()

    c = TestClient(app)
    r = c.post(
        f"/partner/drivers/{driver_id_str}/zones/sessions/{sid}/approve-extension",
        json={"extra_seconds": 120},
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "driver_not_found_for_partner"


def test_zone_session_open_ok() -> None:
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
        r = client.get("/driver/zones/sessions/open")
        assert r.status_code == 200
        assert r.json()["id"] == sid
        assert r.json()["status"] == "open"
    finally:
        _reset_overrides()
        db.close()
