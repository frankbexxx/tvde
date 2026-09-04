"""M2-L3: rolling 24h driving-hours + no fixed 11h rest + audits."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driving_compliance import (
    MAX_ACTIVE_DRIVING_SEC,
    WARNING_ACTIVE_DRIVING_SEC,
    active_driving_seconds_in_rolling_24h,
    driver_compliance_snapshot,
    maybe_apply_rest_after_segment_close,
    on_trip_status_change_for_driving_compliance,
    overlap_seconds_utc,
    rolling_24h_bounds_utc,
)

LISBON = ZoneInfo("Europe/Lisbon")


def test_overlap_seconds_partial() -> None:
    s = datetime(2026, 5, 6, 10, 0, tzinfo=timezone.utc)
    e = datetime(2026, 5, 6, 12, 0, tzinfo=timezone.utc)
    w0 = datetime(2026, 5, 6, 11, 0, tzinfo=timezone.utc)
    w1 = datetime(2026, 5, 6, 13, 0, tzinfo=timezone.utc)
    assert overlap_seconds_utc(s, e, w0, w1) == 3600.0


def test_rolling_24h_bounds() -> None:
    ref = datetime(2026, 9, 4, 15, 0, tzinfo=timezone.utc)
    start, end = rolling_24h_bounds_utc(ref)
    assert end == ref
    assert (end - start).total_seconds() == 24 * 3600


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


def _make_trip(db: Session) -> Trip:
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
    return trip


def _add_segment(
    db: Session,
    *,
    driver_id: uuid.UUID,
    trip_id: uuid.UUID,
    started_at: datetime,
    ended_at: datetime | None,
) -> None:
    db.add(
        DriverActiveDrivingSegment(
            driver_id=driver_id,
            trip_id=trip_id,
            started_at=started_at,
            ended_at=ended_at,
        )
    )
    db.commit()


def test_rolling_segment_fully_inside() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 18, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=3),
            ended_at=now - timedelta(hours=1),
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 2 * 3600
    finally:
        db.close()


def test_rolling_segment_partially_inside() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 12, 0, tzinfo=timezone.utc)
        # Starts 25h ago, ends 23h ago → 1h inside window
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=25),
            ended_at=now - timedelta(hours=23),
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 3600.0
    finally:
        db.close()


def test_rolling_segment_fully_outside() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 12, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=30),
            ended_at=now - timedelta(hours=26),
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 0.0
    finally:
        db.close()


def test_rolling_multiple_segments() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        t1 = _make_trip(db)
        t2 = _make_trip(db)
        now = datetime(2026, 9, 4, 20, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=t1.id,
            started_at=now - timedelta(hours=5),
            ended_at=now - timedelta(hours=4),
        )
        _add_segment(
            db,
            driver_id=uid,
            trip_id=t2.id,
            started_at=now - timedelta(hours=2),
            ended_at=now - timedelta(hours=1),
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 2 * 3600
    finally:
        db.close()


def test_rolling_open_segment() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 16, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=2),
            ended_at=None,
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 2 * 3600
    finally:
        db.close()


def test_rolling_crosses_lisbon_midnight_without_civil_reset() -> None:
    """Segment spanning Lisbon midnight still counts fully in rolling window."""
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        # 2026-03-20 23:00 Lisbon → 2026-03-21 01:00 Lisbon = 2h
        start_lx = datetime(2026, 3, 20, 23, 0, tzinfo=LISBON)
        end_lx = datetime(2026, 3, 21, 1, 0, tzinfo=LISBON)
        now = end_lx.astimezone(timezone.utc) + timedelta(hours=1)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=start_lx.astimezone(timezone.utc),
            ended_at=end_lx.astimezone(timezone.utc),
        )
        sec = active_driving_seconds_in_rolling_24h(db, uid, now)
        assert sec == 2 * 3600
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["active_seconds_today"] == 2 * 3600
    finally:
        db.close()


def test_rolling_segment_older_than_24h_distance() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 12, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=48),
            ended_at=now - timedelta(hours=40),
        )
        assert active_driving_seconds_in_rolling_24h(db, uid, now) == 0.0
    finally:
        db.close()


def test_limit_exact_10h() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 22, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["active_seconds_today"] == MAX_ACTIVE_DRIVING_SEC
        assert snap["limit_reached"] is True
        assert snap["warning"] is False
        assert snap["blocked_accept"] is False
    finally:
        db.close()


def test_limit_below_and_warning() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 22, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=WARNING_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["limit_reached"] is False
        assert snap["warning"] is True
    finally:
        db.close()


def test_limit_above_10h() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 22, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC + 600),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["active_seconds_today"] == MAX_ACTIVE_DRIVING_SEC + 600
        assert snap["limit_reached"] is True
    finally:
        db.close()


def test_limit_cleared_when_old_time_exits_window() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        t0 = datetime(2026, 9, 3, 10, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=t0,
            ended_at=t0 + timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
        )
        at_limit = t0 + timedelta(seconds=MAX_ACTIVE_DRIVING_SEC + 60)
        assert driver_compliance_snapshot(db, uid, now_utc=at_limit)["limit_reached"] is True
        # 24h after segment end → fully outside window
        cleared_at = t0 + timedelta(seconds=MAX_ACTIVE_DRIVING_SEC) + timedelta(hours=24, seconds=1)
        snap = driver_compliance_snapshot(db, uid, now_utc=cleared_at)
        assert snap["active_seconds_today"] == 0
        assert snap["limit_reached"] is False
    finally:
        db.close()


def test_dst_spring_forward_lisbon_stable_utc_window() -> None:
    """EU DST 2026-03-29: rolling window uses UTC elapsed time, not civil clock."""
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        # 01:30 UTC = before Lisbon spring jump; drive 2h UTC
        start = datetime(2026, 3, 29, 0, 30, tzinfo=timezone.utc)
        end = start + timedelta(hours=2)
        now = end + timedelta(hours=1)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=start,
            ended_at=end,
        )
        assert active_driving_seconds_in_rolling_24h(db, uid, now) == 2 * 3600
    finally:
        db.close()


def test_hitting_10h_does_not_set_fixed_11h_rest() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        trip.driver_id = uid
        trip.status = TripStatus.ongoing
        db.commit()

        now = datetime(2026, 9, 4, 20, 0, tzinfo=timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=None,
        )
        # Close via status change (would previously set rest_until +11h)
        on_trip_status_change_for_driving_compliance(
            db, trip, TripStatus.ongoing, TripStatus.completed, at=now
        )
        db.commit()
        driver = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        assert driver.driving_rest_until is None
        maybe_apply_rest_after_segment_close(db, driver_user_id=uid, closed_at=now)
        db.commit()
        db.refresh(driver)
        assert driver.driving_rest_until is None
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is False
    finally:
        db.close()


def test_legacy_rest_future_below_10h_does_not_set_limit_reached() -> None:
    """driving_rest_until futuro + rolling <10h → limit_reached=false."""
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 16, 0, tzinfo=timezone.utc)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = now + timedelta(hours=5)
        db.commit()
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=2),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["legacy_rest_active"] is True
        assert snap["active_seconds_today"] == 2 * 3600
        assert snap["limit_reached"] is False
        assert snap["blocked_accept"] is False
    finally:
        db.close()


def test_legacy_rest_future_with_rolling_10h_limit_from_rolling_only() -> None:
    """driving_rest_until futuro + rolling >=10h → limit_reached=true por rolling."""
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 22, 0, tzinfo=timezone.utc)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = now + timedelta(hours=5)
        db.commit()
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["legacy_rest_active"] is True
        assert snap["limit_reached"] is True
        assert snap["active_seconds_today"] == MAX_ACTIVE_DRIVING_SEC
        assert snap["blocked_accept"] is False
    finally:
        db.close()


def test_legacy_rest_expired_does_not_affect_calculation() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime(2026, 9, 4, 16, 0, tzinfo=timezone.utc)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = now - timedelta(hours=1)
        db.commit()
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=1),
            ended_at=now,
        )
        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["legacy_rest_active"] is False
        assert snap["limit_reached"] is False
        assert snap["active_seconds_today"] == 3600
    finally:
        db.close()


def test_admin_override_legacy_does_not_change_10h_result() -> None:
    from fastapi.testclient import TestClient

    from app.api.deps import UserContext, get_current_user
    from app.main import app
    from app.models.enums import Role

    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    client = TestClient(app)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(hours=3),
            ended_at=now,
        )
        before = driver_compliance_snapshot(db, uid, now_utc=now)
        assert before["limit_reached"] is False

        until = now + timedelta(hours=11)
        r = client.post(
            f"/admin/drivers/{uid}/driving-rest-override",
            json={
                "governance_reason": "override legado nao deve mudar 10h",
                "rest_until": until.isoformat(),
            },
        )
        assert r.status_code == 200, r.text
        db.expire_all()
        after = driver_compliance_snapshot(db, uid, now_utc=now)
        assert after["legacy_rest_active"] is True
        assert after["limit_reached"] is False
        assert after["blocked_accept"] is False
        assert after["active_seconds_today"] == before["active_seconds_today"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.close()


def test_audit_legacy_rest_without_affecting_eligibility() -> None:
    from app.services.driving_compliance import audit_compliance_transitions

    db = SessionLocal()
    try:
        uid = _make_driver(db)
        at = datetime(2026, 9, 4, 20, 0, tzinfo=timezone.utc)
        base = {
            "enabled": True,
            "warning": False,
            "limit_reached": False,
            "active_seconds_today": 3600,
            "max_seconds": MAX_ACTIVE_DRIVING_SEC,
            "enforcement_enabled": False,
            "window_seconds": 86400,
            "counted_policy": "test",
            "rest_until": None,
        }
        audit_compliance_transitions(
            db,
            driver_user_id=uid,
            before={**base, "legacy_rest_active": False},
            after={
                **base,
                "legacy_rest_active": True,
                "rest_until": at + timedelta(hours=2),
            },
            at=at,
            trigger="unit_test_legacy",
        )
        db.commit()
        events = (
            db.execute(
                select(AuditEvent).where(
                    AuditEvent.entity_id == str(uid),
                    AuditEvent.event_type == "driving_hours.legacy_rest_detected",
                )
            )
            .scalars()
            .all()
        )
        assert len(events) == 1
        # Eligibility flags in after remain false (audit only).
        assert events[0].payload["after"]["limit_reached"] is False
    finally:
        db.close()


def test_audit_on_limit_reached_transition() -> None:
    from app.services.driving_compliance import audit_compliance_transitions

    db = SessionLocal()
    try:
        uid = _make_driver(db)
        at = datetime(2026, 9, 4, 20, 0, tzinfo=timezone.utc)
        before = {
            "enabled": True,
            "warning": False,
            "limit_reached": False,
            "legacy_rest_active": False,
            "active_seconds_today": MAX_ACTIVE_DRIVING_SEC - 60,
            "max_seconds": MAX_ACTIVE_DRIVING_SEC,
            "enforcement_enabled": False,
            "window_seconds": 86400,
            "counted_policy": "test",
            "rest_until": None,
        }
        after = {
            **before,
            "limit_reached": True,
            "active_seconds_today": MAX_ACTIVE_DRIVING_SEC,
        }
        audit_compliance_transitions(
            db,
            driver_user_id=uid,
            before=before,
            after=after,
            at=at,
            trigger="unit_test",
        )
        db.commit()
        events = (
            db.execute(
                select(AuditEvent).where(
                    AuditEvent.entity_id == str(uid),
                    AuditEvent.event_type == "driving_hours.limit_reached",
                )
            )
            .scalars()
            .all()
        )
        assert len(events) == 1
    finally:
        db.close()


def test_audit_warning_and_limit_cleared() -> None:
    from app.services.driving_compliance import audit_compliance_transitions

    db = SessionLocal()
    try:
        uid = _make_driver(db)
        at = datetime(2026, 9, 4, 21, 0, tzinfo=timezone.utc)
        base = {
            "enabled": True,
            "legacy_rest_active": False,
            "max_seconds": MAX_ACTIVE_DRIVING_SEC,
            "enforcement_enabled": False,
            "window_seconds": 86400,
            "counted_policy": "test",
            "rest_until": None,
        }
        audit_compliance_transitions(
            db,
            driver_user_id=uid,
            before={**base, "warning": False, "limit_reached": False, "active_seconds_today": 0},
            after={
                **base,
                "warning": True,
                "limit_reached": False,
                "active_seconds_today": WARNING_ACTIVE_DRIVING_SEC,
            },
            at=at,
            trigger="unit_test_warn",
        )
        audit_compliance_transitions(
            db,
            driver_user_id=uid,
            before={
                **base,
                "warning": False,
                "limit_reached": True,
                "active_seconds_today": MAX_ACTIVE_DRIVING_SEC,
            },
            after={**base, "warning": False, "limit_reached": False, "active_seconds_today": 0},
            at=at + timedelta(seconds=1),
            trigger="unit_test_clear",
        )
        db.commit()
        types = {
            e.event_type
            for e in db.execute(
                select(AuditEvent).where(AuditEvent.entity_id == str(uid))
            )
            .scalars()
            .all()
        }
        assert "driving_hours.warning_reached" in types
        assert "driving_hours.limit_cleared" in types
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
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )

        snap = driver_compliance_snapshot(db, uid, now_utc=now)
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
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )

        snap = driver_compliance_snapshot(db, uid, now_utc=now)
        assert snap["limit_reached"] is True
        assert snap["blocked_accept"] is False
        assert_driver_can_accept_by_driving_hours(db, uid)
    finally:
        db.close()


def test_apply_availability_does_not_force_offline_without_enforcement(monkeypatch) -> None:
    from app.core.config import settings
    from app.services.driving_compliance import apply_availability_after_trip_ends_with_compliance

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.is_available = False
        db.commit()

        apply_availability_after_trip_ends_with_compliance(db, str(uid))
        db.commit()
        db.refresh(driver_row)
        assert driver_row.is_available is True
    finally:
        db.close()


def test_go_online_allows_when_limit_reached_and_enforcement_off(monkeypatch) -> None:
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
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.is_available = False
        db.commit()

        snap = driver_compliance_snapshot(db, uid, now_utc=now)
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
        trip = _make_trip(db)
        now = datetime.now(timezone.utc)
        _add_segment(
            db,
            driver_id=uid,
            trip_id=trip.id,
            started_at=now - timedelta(seconds=MAX_ACTIVE_DRIVING_SEC),
            ended_at=now,
        )
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
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


def test_go_online_allows_with_legacy_rest_even_if_enforcement_on(monkeypatch) -> None:
    """Legacy rest alone must not block eligibility when rolling < 10h."""
    import asyncio

    from app.api.deps import UserContext
    from app.api.routers import driver_status
    from app.core.config import settings
    from app.models.enums import Role

    monkeypatch.setattr(settings, "ENABLE_DRIVING_HOURS_ENFORCEMENT", True)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        driver_row.driving_rest_until = datetime.now(timezone.utc) + timedelta(hours=2)
        driver_row.is_available = False
        db.commit()

        snap = driver_compliance_snapshot(db, uid)
        assert snap["legacy_rest_active"] is True
        assert snap["limit_reached"] is False
        assert snap["blocked_accept"] is False

        user = UserContext(user_id=str(uid), role=Role.driver)
        result = asyncio.run(driver_status.go_online(user=user, db=db))
        assert result["is_available"] is True
    finally:
        db.close()


def test_defaults_compliance_on_enforcement_off() -> None:
    from app.core.config import settings

    assert settings.ENABLE_VEHICLE_COMPLIANCE_GATES is False
    assert settings.ENABLE_DRIVING_HOURS_COMPLIANCE is True
    assert settings.ENABLE_DRIVING_HOURS_ENFORCEMENT is False


def test_admin_rest_override_does_not_invent_11h() -> None:
    """Override sets explicit rest_until only; no automatic +11h policy."""
    from fastapi.testclient import TestClient

    from app.api.deps import UserContext, get_current_user
    from app.main import app
    from app.models.enums import Role

    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    client = TestClient(app)
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        until = datetime.now(timezone.utc) + timedelta(hours=2)
        r = client.post(
            f"/admin/drivers/{uid}/driving-rest-override",
            json={
                "governance_reason": "teste legado override rest manual",
                "rest_until": until.isoformat(),
            },
        )
        assert r.status_code == 200, r.text
        db.expire_all()
        row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        assert row.driving_rest_until is not None
        delta = abs((row.driving_rest_until - until).total_seconds())
        assert delta < 2.0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.close()
