"""B4: horas de condução activa (Lisboa) + bloqueio + repouso."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driving_compliance import (
    MAX_ACTIVE_DRIVING_SEC,
    WARNING_ACTIVE_DRIVING_SEC,
    active_driving_seconds_in_lisbon_day,
    driver_compliance_snapshot,
    lisbon_calendar_day_bounds_utc,
    overlap_seconds_utc,
)


def test_overlap_seconds_partial() -> None:
    s = datetime(2026, 5, 6, 10, 0, tzinfo=timezone.utc)
    e = datetime(2026, 5, 6, 12, 0, tzinfo=timezone.utc)
    w0 = datetime(2026, 5, 6, 11, 0, tzinfo=timezone.utc)
    w1 = datetime(2026, 5, 6, 13, 0, tzinfo=timezone.utc)
    assert overlap_seconds_utc(s, e, w0, w1) == 3600.0


def test_lisbon_day_bounds_cross_midnight_utc() -> None:
    """Instante em UTC ainda no 'dia anterior' em Lisboa."""
    ref = datetime(2026, 5, 5, 23, 30, tzinfo=timezone.utc)
    start, nxt = lisbon_calendar_day_bounds_utc(ref)
    assert start < nxt
    assert (nxt - start).total_seconds() == 86400


def _make_driver(db: Session) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"Duty {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
        is_available=True,
    )
    db.add(d)
    db.commit()
    return user.id


def test_active_seconds_sums_segments_today() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        pax = User(
            role=Role.passenger,
            name=f"Pax {uuid.uuid4()}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(pax)
        db.flush()
        trip = Trip(
            passenger_id=pax.id,
            status=TripStatus.completed,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
        )
        db.add(trip)
        db.flush()

        day_start, _ = lisbon_calendar_day_bounds_utc(datetime.now(timezone.utc))
        t0 = day_start + timedelta(hours=1)
        t1 = t0 + timedelta(seconds=MAX_ACTIVE_DRIVING_SEC - 60)
        seg = DriverActiveDrivingSegment(
            driver_id=uid,
            trip_id=trip.id,
            started_at=t0,
            ended_at=t1,
        )
        db.add(seg)
        db.commit()

        now = day_start + timedelta(hours=15)
        sec = active_driving_seconds_in_lisbon_day(db, uid, now)
        assert MAX_ACTIVE_DRIVING_SEC - 120 <= sec <= MAX_ACTIVE_DRIVING_SEC
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["enabled"] is True
        assert snap["warning"] or snap["active_seconds_today"] >= WARNING_ACTIVE_DRIVING_SEC
    finally:
        db.close()


def test_rest_until_sets_limit_reached_without_enforcement_by_default() -> None:
    """A3-D04: rest_until → limit_reached; blocked_accept só com ENFORCEMENT."""
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        until = datetime.now(timezone.utc) + timedelta(hours=3)
        driver_row.driving_rest_until = until
        db.commit()

        from app.core.config import settings

        assert settings.ENABLE_DRIVING_HOURS_ENFORCEMENT is False
        snap = driver_compliance_snapshot(db, uid, now_utc=datetime.now(timezone.utc))
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is False
        assert snap["enforcement_enabled"] is False

        snap2 = driver_compliance_snapshot(db, uid, now_utc=until + timedelta(seconds=1))
        assert snap2["limit_reached"] is False
        assert snap2["blocked_accept"] is False
    finally:
        db.close()


def test_enforcement_on_blocks_accept_when_limit_reached(monkeypatch) -> None:
    from app.core.config import settings
    from app.services.driving_compliance import assert_driver_can_accept_by_driving_hours
    from fastapi import HTTPException

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", True)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        db.commit()

        snap = driver_compliance_snapshot(db, uid)
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is True
        try:
            assert_driver_can_accept_by_driving_hours(db, uid)
            raise AssertionError("expected HTTPException")
        except HTTPException as exc:
            assert exc.status_code == 409
            assert exc.detail == "driving_hours_blocked"
    finally:
        db.close()


def test_enforcement_off_allows_accept_when_limit_reached(monkeypatch) -> None:
    from app.core.config import settings
    from app.services.driving_compliance import assert_driver_can_accept_by_driving_hours

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        db.commit()

        snap = driver_compliance_snapshot(db, uid)
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is False
        assert_driver_can_accept_by_driving_hours(db, uid)  # no raise
    finally:
        db.close()


def test_apply_availability_does_not_force_offline_without_enforcement(monkeypatch) -> None:
    from app.core.config import settings
    from app.services.driving_compliance import apply_availability_after_trip_ends_with_compliance

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        driver_row.is_available = False
        db.commit()

        apply_availability_after_trip_ends_with_compliance(db, str(uid))
        db.commit()
        db.refresh(driver_row)
        assert driver_row.is_available is True
    finally:
        db.close()


def test_go_online_allows_when_limit_reached_and_enforcement_off(monkeypatch) -> None:
    """A3.8: POST /online não devolve 409 driving_hours_blocked com enforcement OFF."""
    import asyncio

    from app.api.deps import UserContext
    from app.api.routers import driver_status
    from app.core.config import settings
    from app.models.enums import Role

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        driver_row.is_available = False
        db.commit()

        snap = driver_compliance_snapshot(db, uid)
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is False

        user = UserContext(user_id=str(uid), role=Role.driver)
        result = asyncio.run(driver_status.go_online(user=user, db=db))
        assert result["is_available"] is True
        db.refresh(driver_row)
        assert driver_row.is_available is True
    finally:
        db.close()


def test_go_online_blocks_when_enforcement_on(monkeypatch) -> None:
    import asyncio

    from app.api.deps import UserContext
    from app.api.routers import driver_status
    from app.core.config import settings
    from app.models.enums import Role
    from fastapi import HTTPException

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", True)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        driver_row.is_available = False
        db.commit()

        user = UserContext(user_id=str(uid), role=Role.driver)
        try:
            asyncio.run(driver_status.go_online(user=user, db=db))
            raise AssertionError("expected HTTPException")
        except HTTPException as exc:
            assert exc.status_code == 409
            assert exc.detail == "driving_hours_blocked"
        db.refresh(driver_row)
        assert driver_row.is_available is False
    finally:
        db.close()


def test_vehicle_compliance_gates_flag_unchanged_by_a38() -> None:
    """A3.8 não relaxa PF3D: ENABLE_VEHICLE_COMPLIANCE_GATES permanece default OFF."""
    from app.core.config import settings

    assert settings.ENABLE_VEHICLE_COMPLIANCE_GATES is False
    assert settings.ENABLE_DRIVING_HOURS_COMPLIANCE is True
    assert settings.ENABLE_DRIVING_HOURS_ENFORCEMENT is False
