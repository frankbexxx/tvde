"""Condução activa (arriving + ongoing): limite diário (dia civil Europe/Lisbon) + repouso.

Ver docs/prompts/EXTRA-2026-05-13-DECISOES.md — não substitui validação jurídica.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.trip import Trip
from app.models.enums import TripStatus

LISBON_TZ = ZoneInfo("Europe/Lisbon")

MAX_ACTIVE_DRIVING_SEC = 10 * 3600
WARNING_ACTIVE_DRIVING_SEC = 8 * 3600
MIN_REST_AFTER_LIMIT_SEC = 11 * 3600


def overlap_seconds_utc(
    seg_start: datetime,
    seg_end: datetime,
    win_start: datetime,
    win_end: datetime,
) -> float:
    """Intersection length in seconds; all instants must be timezone-aware UTC."""
    a0 = max(seg_start, win_start)
    a1 = min(seg_end, win_end)
    if a0 >= a1:
        return 0.0
    return (a1 - a0).total_seconds()


def lisbon_calendar_day_bounds_utc(instant_utc: datetime) -> tuple[datetime, datetime]:
    """Return [day_start_utc, next_day_start_utc) for the Lisbon civil day containing instant_utc."""
    if instant_utc.tzinfo is None:
        instant_utc = instant_utc.replace(tzinfo=timezone.utc)
    ins = instant_utc.astimezone(LISBON_TZ)
    d: date = ins.date()
    start_lisbon = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=LISBON_TZ)
    next_start_lisbon = start_lisbon + timedelta(days=1)
    return start_lisbon.astimezone(timezone.utc), next_start_lisbon.astimezone(timezone.utc)


def active_driving_seconds_in_lisbon_day(
    db: Session,
    driver_user_id: uuid.UUID,
    reference_utc: datetime,
) -> float:
    """Sum overlapping seconds of closed + open segments with the Lisbon day of reference_utc."""
    day_start, next_day_start = lisbon_calendar_day_bounds_utc(reference_utc)
    rows = (
        db.execute(
            select(DriverActiveDrivingSegment).where(
                DriverActiveDrivingSegment.driver_id == driver_user_id,
                DriverActiveDrivingSegment.started_at < next_day_start,
                or_(
                    DriverActiveDrivingSegment.ended_at.is_(None),
                    DriverActiveDrivingSegment.ended_at > day_start,
                ),
            )
        )
        .scalars()
        .all()
    )
    if reference_utc.tzinfo is None:
        reference_utc = reference_utc.replace(tzinfo=timezone.utc)
    total = 0.0
    for seg in rows:
        seg_end = seg.ended_at if seg.ended_at is not None else reference_utc
        total += overlap_seconds_utc(seg.started_at, seg_end, day_start, next_day_start)
    return total


def driver_compliance_snapshot(
    db: Session,
    driver_user_id: uuid.UUID | str,
    now_utc: datetime | None = None,
) -> dict:
    """
    Snapshot for UI / guards.
    blocked_accept: não deve aceitar nova viagem nem ficar online (excepto viagem já aceite).
    """
    if not settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        return {
            "enabled": False,
            "active_seconds_today": 0,
            "max_seconds": MAX_ACTIVE_DRIVING_SEC,
            "warning_threshold_seconds": WARNING_ACTIVE_DRIVING_SEC,
            "warning": False,
            "blocked_accept": False,
            "rest_until": None,
        }

    driver_uuid = uuid.UUID(str(driver_user_id))
    now = now_utc or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    driver = db.execute(select(Driver).where(Driver.user_id == driver_uuid)).scalar_one_or_none()
    rest_until = driver.driving_rest_until if driver else None

    active_sec = active_driving_seconds_in_lisbon_day(db, driver_uuid, now)
    rest_block = rest_until is not None and now < rest_until.astimezone(timezone.utc)
    daily_block = active_sec >= MAX_ACTIVE_DRIVING_SEC
    blocked = rest_block or daily_block
    warning = (
        not blocked
        and active_sec >= WARNING_ACTIVE_DRIVING_SEC
        and active_sec < MAX_ACTIVE_DRIVING_SEC
    )

    return {
        "enabled": True,
        "active_seconds_today": int(active_sec),
        "max_seconds": MAX_ACTIVE_DRIVING_SEC,
        "warning_threshold_seconds": WARNING_ACTIVE_DRIVING_SEC,
        "warning": warning,
        "blocked_accept": blocked,
        "rest_until": rest_until,
    }


def open_active_driving_segment(
    db: Session,
    *,
    driver_id: uuid.UUID,
    trip_id: uuid.UUID,
    at: datetime,
) -> None:
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    existing_open = db.execute(
        select(DriverActiveDrivingSegment).where(
            DriverActiveDrivingSegment.trip_id == trip_id,
            DriverActiveDrivingSegment.ended_at.is_(None),
        )
    ).scalar_one_or_none()
    if existing_open:
        return
    db.add(
        DriverActiveDrivingSegment(
            driver_id=driver_id,
            trip_id=trip_id,
            started_at=at,
            ended_at=None,
        )
    )


def close_active_driving_segment(
    db: Session,
    *,
    trip_id: uuid.UUID,
    at: datetime,
) -> None:
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    seg = db.execute(
        select(DriverActiveDrivingSegment).where(
            DriverActiveDrivingSegment.trip_id == trip_id,
            DriverActiveDrivingSegment.ended_at.is_(None),
        )
    ).scalar_one_or_none()
    if not seg:
        return
    seg.ended_at = at


def maybe_apply_rest_after_segment_close(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    closed_at: datetime,
) -> None:
    """
    Se o total do dia civil (Lisboa) da data de fecho >= 10h, impõe repouso 11h
    a partir do fecho do segmento.
    """
    if not settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        return
    if closed_at.tzinfo is None:
        closed_at = closed_at.replace(tzinfo=timezone.utc)

    total = active_driving_seconds_in_lisbon_day(db, driver_user_id, closed_at)
    if total < MAX_ACTIVE_DRIVING_SEC:
        return

    driver = db.execute(select(Driver).where(Driver.user_id == driver_user_id)).scalar_one_or_none()
    if not driver:
        return

    new_rest = closed_at + timedelta(seconds=MIN_REST_AFTER_LIMIT_SEC)
    prev = driver.driving_rest_until
    if prev is None or new_rest > prev.astimezone(timezone.utc):
        driver.driving_rest_until = new_rest


def on_trip_status_change_for_driving_compliance(
    db: Session,
    trip: Trip,
    old_status: TripStatus,
    new_status: TripStatus,
    *,
    at: datetime | None = None,
) -> None:
    if not settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        return
    if trip.driver_id is None:
        return

    at = at or datetime.now(timezone.utc)
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)

    driver_uuid = trip.driver_id

    if new_status == TripStatus.arriving and old_status == TripStatus.accepted:
        open_active_driving_segment(
            db,
            driver_id=driver_uuid,
            trip_id=trip.id,
            at=at,
        )
        return

    if old_status in (TripStatus.arriving, TripStatus.ongoing) and new_status in (
        TripStatus.completed,
        TripStatus.cancelled,
        TripStatus.failed,
    ):
        close_active_driving_segment(db, trip_id=trip.id, at=at)
        maybe_apply_rest_after_segment_close(db, driver_user_id=driver_uuid, closed_at=at)


def assert_driver_can_accept_by_driving_hours(db: Session, driver_user_id: str | uuid.UUID) -> None:
    from fastapi import HTTPException, status

    snap = driver_compliance_snapshot(db, driver_user_id)
    if snap["enabled"] and snap["blocked_accept"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="driving_hours_blocked",
        )


def apply_availability_after_trip_ends_with_compliance(db: Session, driver_id: str | None) -> None:
    """Substitui _set_driver_available quando o motorista fica livre após viagem."""
    if not driver_id:
        return
    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver:
        return
    driver.is_available = True
    if settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        snap = driver_compliance_snapshot(db, driver.user_id)
        if snap["blocked_accept"]:
            driver.is_available = False
