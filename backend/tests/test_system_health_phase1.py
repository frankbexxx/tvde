"""System health Phase 1 — critical vs informational severity (B + A)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

import app.api.routers.cron as cron_router
import app.cron.system_health_check as system_health_check_module
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.cron.system_health_check import run_system_health_check
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.system_health import get_system_health
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _purge_user_and_trips(db: Session, user_id: str) -> None:
    """Remove test user, driver row, and trips linked as driver or passenger."""
    uid = uuid.UUID(user_id)
    trip_ids = [
        t.id
        for t in db.execute(
            select(Trip).where(or_(Trip.driver_id == uid, Trip.passenger_id == uid))
        ).scalars()
    ]
    for tid in trip_ids:
        db.execute(delete(Payment).where(Payment.trip_id == tid))
        db.execute(delete(Trip).where(Trip.id == tid))
    db.execute(delete(Driver).where(Driver.user_id == uid))
    user = db.get(User, uid)
    if user:
        db.delete(user)
    db.commit()


def _purge_stuck_payment_fixture(db: Session, payment_id: str) -> None:
    pid = uuid.UUID(payment_id)
    pay = db.get(Payment, pid)
    if not pay:
        return
    trip_id = pay.trip_id
    passenger_id = None
    trip = db.get(Trip, trip_id) if trip_id else None
    if trip:
        passenger_id = trip.passenger_id
    db.delete(pay)
    if trip:
        db.delete(trip)
    if passenger_id:
        pax = db.get(User, passenger_id)
        if pax:
            db.delete(pax)
    db.commit()


def _purge_trip_only(db: Session, trip_id: str) -> None:
    tid = uuid.UUID(trip_id)
    db.execute(delete(Payment).where(Payment.trip_id == tid))
    trip = db.get(Trip, tid)
    if trip:
        db.delete(trip)
    db.commit()


def _offline_driver(
    db: Session,
    *,
    is_test_account: bool = False,
    minutes_offline: int = 15,
) -> str:
    user = User(
        role=Role.driver,
        name=f"Health Driver {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
        is_test_account=is_test_account,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
        is_available=False,
    )
    db.add(driver)
    db.commit()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes_offline)
    db.execute(
        update(Driver)
        .where(Driver.user_id == user.id)
        .values(updated_at=cutoff)
    )
    db.commit()
    return str(user.id)


def _stuck_payment(db: Session) -> str:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.72,
        destination_lng=-9.14,
        estimated_price=10.0,
        distance_km=2.0,
        duration_min=8.0,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        stripe_payment_intent_id=f"pi_test_{uuid.uuid4().hex[:16]}",
        total_amount=10.0,
        currency="EUR",
        status=PaymentStatus.processing,
        commission_amount=1.0,
        driver_amount=9.0,
        driver_payout=9.0,
    )
    db.add(payment)
    db.commit()
    old = datetime.now(timezone.utc) - timedelta(minutes=20)
    db.execute(update(Payment).where(Payment.id == payment.id).values(updated_at=old))
    db.commit()
    return str(payment.id)


def _trip_accepted_too_long(db: Session) -> str:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.72,
        destination_lng=-9.14,
        estimated_price=10.0,
        distance_km=2.0,
        duration_min=8.0,
    )
    db.add(trip)
    db.commit()
    old = datetime.now(timezone.utc) - timedelta(minutes=45)
    db.execute(update(Trip).where(Trip.id == trip.id).values(updated_at=old))
    db.commit()
    return str(trip.id)


def test_b1_real_driver_offline_status_ok(db: Session | None = None) -> None:
    session = db or _db()
    driver_id: str | None = None
    try:
        before = get_system_health(session)
        driver_id = _offline_driver(session, is_test_account=False)
        health = get_system_health(session)
        assert health["warnings"] == before["warnings"]
        assert health["status"] == before["status"]
        assert any(r["driver_id"] == driver_id for r in health["drivers_unavailable_too_long"])
        assert health["informational_warnings"]
        assert "unavailable without trip" in health["informational_warnings"][-1]
        assert not any("unavailable" in w for w in health["warnings"])
    finally:
        if driver_id:
            _purge_user_and_trips(session, driver_id)
        if db is None:
            session.close()


def test_b2_demo_driver_offline_flagged(db: Session | None = None) -> None:
    session = db or _db()
    driver_id: str | None = None
    try:
        before = get_system_health(session)
        driver_id = _offline_driver(session, is_test_account=True)
        health = get_system_health(session)
        assert health["warnings"] == before["warnings"]
        assert health["status"] == before["status"]
        row = next(
            r for r in health["drivers_unavailable_too_long"] if r["driver_id"] == driver_id
        )
        assert row["is_test_account"] is True
    finally:
        if driver_id:
            _purge_user_and_trips(session, driver_id)
        if db is None:
            session.close()


def test_b3_stuck_payment_degraded(db: Session | None = None) -> None:
    session = db or _db()
    pid: str | None = None
    try:
        pid = _stuck_payment(session)
        health = get_system_health(session)
        assert health["status"] == "degraded"
        assert any(r.get("id") == pid for r in health["stuck_payments"])
        assert health["warnings"]
    finally:
        if pid:
            _purge_stuck_payment_fixture(session, pid)
        if db is None:
            session.close()


def test_b4_critical_and_offline_both(db: Session | None = None) -> None:
    session = db or _db()
    driver_id: str | None = None
    pid: str | None = None
    try:
        driver_id = _offline_driver(session)
        pid = _stuck_payment(session)
        health = get_system_health(session)
        assert health["status"] == "degraded"
        assert health["warnings"]
        assert health["informational_warnings"]
        assert any(r.get("id") == pid for r in health["stuck_payments"])
    finally:
        if pid:
            _purge_stuck_payment_fixture(session, pid)
        if driver_id:
            _purge_user_and_trips(session, driver_id)
        if db is None:
            session.close()


def test_b5_offline_with_active_trip_excluded(db: Session | None = None) -> None:
    session = db or _db()
    driver_id: str | None = None
    passenger_id: uuid.UUID | None = None
    trip_id: uuid.UUID | None = None
    try:
        driver_id = _offline_driver(session)
        passenger = User(
            role=Role.passenger,
            name=f"P {uuid.uuid4()}",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        session.add(passenger)
        session.flush()
        trip = Trip(
            passenger_id=passenger.id,
            driver_id=uuid.UUID(driver_id),
            status=TripStatus.accepted,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.72,
            destination_lng=-9.14,
            estimated_price=10.0,
            distance_km=2.0,
            duration_min=8.0,
        )
        session.add(trip)
        session.commit()
        passenger_id = passenger.id
        trip_id = trip.id
        health = get_system_health(session)
        ids = {r["driver_id"] for r in health["drivers_unavailable_too_long"]}
        assert driver_id not in ids
    finally:
        if trip_id:
            _purge_trip_only(session, str(trip_id))
        if passenger_id:
            pax = session.get(User, passenger_id)
            if pax:
                session.delete(pax)
                session.commit()
        if driver_id:
            _purge_user_and_trips(session, driver_id)
        if db is None:
            session.close()


def test_b6_admin_endpoint_includes_informational_warnings(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.deps import UserContext, get_current_user
    from app.models.enums import Role

    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    try:
        r = client.get("/admin/system-health")
        assert r.status_code == 200
        data = r.json()
        assert "informational_warnings" in data
        assert isinstance(data["informational_warnings"], list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_b7_cron_offline_only_http_200(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "CRON_SECRET", "phase1_secret", raising=False)

    def _info_only(_db: object) -> dict:
        return {
            "status": "ok",
            "stuck_payments": [],
            "trips_accepted_too_long": [],
            "trips_ongoing_too_long": [],
            "drivers_unavailable_too_long": [{"driver_id": "d1", "is_test_account": True}],
            "missing_payment_records": [],
            "inconsistent_financial_state": [],
            "warnings": [],
            "informational_warnings": ["1 driver(s) unavailable without trip"],
        }

    monkeypatch.setattr(cron_router, "run_system_health_check", _info_only)

    r = client.get("/cron/jobs", headers={"X-Cron-Secret": "phase1_secret"})
    assert r.status_code == 200, r.text
    body = r.json()
    sh = body["system_health"]
    assert sh["status"] == "ok"
    assert sh["informational_warnings"] == ["1 driver(s) unavailable without trip"]
    assert sh.get("drivers_unavailable_too_long_count") == 1


def test_b8_system_health_check_log_only_on_critical_degraded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[tuple[str, dict]] = []

    def _capture(name: str, **kwargs: object) -> None:
        events.append((name, dict(kwargs)))

    monkeypatch.setattr(system_health_check_module, "log_event", _capture)

    def _ok_with_offline(_db: object) -> dict:
        return {
            "status": "ok",
            "stuck_payments": [],
            "trips_accepted_too_long": [],
            "trips_ongoing_too_long": [],
            "drivers_unavailable_too_long": [{"driver_id": "d1"}],
            "missing_payment_records": [],
            "inconsistent_financial_state": [],
            "warnings": [],
            "informational_warnings": ["1 driver(s) unavailable without trip"],
        }

    def _degraded_stuck(_db: object) -> dict:
        return {
            "status": "degraded",
            "stuck_payments": [{"id": "p1"}],
            "trips_accepted_too_long": [],
            "trips_ongoing_too_long": [],
            "drivers_unavailable_too_long": [],
            "missing_payment_records": [],
            "inconsistent_financial_state": [],
            "warnings": ["1 payment(s) stuck in processing"],
            "informational_warnings": [],
        }

    monkeypatch.setattr(system_health_check_module, "get_system_health", _ok_with_offline)
    system_health_check_module._last_system_health_status_for_log = None
    run_system_health_check(None)
    assert not any(n == "system_health_degraded" for n, _ in events)

    events.clear()
    monkeypatch.setattr(system_health_check_module, "get_system_health", _degraded_stuck)
    system_health_check_module._last_system_health_status_for_log = None
    run_system_health_check(None)
    assert any(n == "system_health_degraded" for n, _ in events)


def test_trip_accepted_too_long_degraded(db: Session | None = None) -> None:
    session = db or _db()
    tid: str | None = None
    passenger_id: uuid.UUID | None = None
    try:
        tid = _trip_accepted_too_long(session)
        trip = session.get(Trip, uuid.UUID(tid))
        if trip:
            passenger_id = trip.passenger_id
        health = get_system_health(session)
        assert health["status"] == "degraded"
        assert any(r.get("id") == tid for r in health["trips_accepted_too_long"])
    finally:
        if tid:
            _purge_trip_only(session, tid)
        if passenger_id:
            pax = session.get(User, passenger_id)
            if pax:
                session.delete(pax)
                session.commit()
        if db is None:
            session.close()
