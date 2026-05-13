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


def test_rest_until_blocks_even_if_daily_sum_low() -> None:
    db = SessionLocal()
    try:
        uid = _make_driver(db)
        driver_row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
        until = datetime.now(timezone.utc) + timedelta(hours=3)
        driver_row.driving_rest_until = until
        db.commit()

        snap = driver_compliance_snapshot(db, uid, now_utc=datetime.now(timezone.utc))
        assert snap["blocked_accept"] is True

        snap2 = driver_compliance_snapshot(db, uid, now_utc=until + timedelta(seconds=1))
        assert snap2["blocked_accept"] is False
    finally:
        db.close()
