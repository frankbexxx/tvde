"""Driver «zone change» sessions and daily budget (v1).

Consumption: first ``TripStatus.completed`` after ``arrived_at`` closes the session
and increments the day budget (honour-system until geo is wired).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.db.models.driver_zone_day_budget import DriverZoneDayBudget
from app.db.models.driver_zone_session import DriverZoneSession
from app.db.models.trip import Trip
from app.models.enums import TripStatus

ZONE_TZ = ZoneInfo("Europe/Lisbon")


def service_date_local_now() -> date:
    return datetime.now(ZONE_TZ).date()


def count_open_sessions(db: Session, *, driver_id: uuid.UUID) -> int:
    q = select(DriverZoneSession).where(
        and_(
            DriverZoneSession.driver_id == driver_id,
            DriverZoneSession.status == "open",
        )
    )
    return len(db.scalars(q).all())


def budget_values(db: Session, *, driver_id: uuid.UUID, service_date: date) -> tuple[int, int, str]:
    """Returns (used, max, timezone). No row => used 0, max 2."""
    row = db.get(DriverZoneDayBudget, (driver_id, service_date))
    if row is None:
        return 0, 2, "Europe/Lisbon"
    return row.used_changes_count, row.max_changes_count, row.timezone


def create_zone_session(
    db: Session,
    *,
    driver_id: uuid.UUID,
    zone_id: str,
    eta_seconds_baseline: int,
    eta_margin_percent: int,
) -> DriverZoneSession:
    sd = service_date_local_now()
    used, max_c, _tz = budget_values(db, driver_id=driver_id, service_date=sd)
    remaining = max(0, max_c - used)
    if remaining <= 0:
        raise ValueError("zone_change_budget_exhausted")
    if count_open_sessions(db, driver_id=driver_id) >= 1:
        raise ValueError("zone_session_already_open")

    now = datetime.now(ZONE_TZ)
    margin = 1.0 + (eta_margin_percent / 100.0)
    deadline = now + timedelta(seconds=int(eta_seconds_baseline * margin))

    sess = DriverZoneSession(
        id=uuid.uuid4(),
        driver_id=driver_id,
        zone_id=zone_id.strip(),
        started_at=now,
        eta_seconds_baseline=eta_seconds_baseline,
        eta_margin_percent=eta_margin_percent,
        deadline_at=deadline,
        status="open",
    )
    db.add(sess)
    db.flush()
    return sess


def mark_session_arrived(
    db: Session,
    *,
    driver_id: uuid.UUID,
    session_id: uuid.UUID,
) -> DriverZoneSession:
    sess = (
        db.execute(
            select(DriverZoneSession)
            .where(
                and_(
                    DriverZoneSession.id == session_id,
                    DriverZoneSession.driver_id == driver_id,
                    DriverZoneSession.status == "open",
                )
            )
            .with_for_update()
        )
        .scalars()
        .one_or_none()
    )
    if sess is None:
        raise ValueError("zone_session_not_found")
    if sess.arrived_at is not None:
        return sess
    sess.arrived_at = datetime.now(timezone.utc)
    return sess


def cancel_zone_session(
    db: Session,
    *,
    driver_id: uuid.UUID,
    session_id: uuid.UUID,
    cancel_reason: str | None,
) -> DriverZoneSession:
    sess = (
        db.execute(
            select(DriverZoneSession)
            .where(
                and_(
                    DriverZoneSession.id == session_id,
                    DriverZoneSession.driver_id == driver_id,
                    DriverZoneSession.status == "open",
                )
            )
            .with_for_update()
        )
        .scalars()
        .one_or_none()
    )
    if sess is None:
        raise ValueError("zone_session_not_found")
    sess.status = "cancelled"
    if cancel_reason:
        sess.cancel_reason = cancel_reason.strip()[:2000]
    return sess


def _increment_day_budget_used(
    db: Session,
    *,
    driver_id: uuid.UUID,
    service_date: date,
) -> None:
    row = db.get(DriverZoneDayBudget, (driver_id, service_date))
    if row is None:
        row = DriverZoneDayBudget(
            driver_id=driver_id,
            service_date=service_date,
            used_changes_count=0,
            max_changes_count=2,
            timezone="Europe/Lisbon",
        )
        db.add(row)
        db.flush()
    row.used_changes_count = int(row.used_changes_count) + 1


def maybe_consume_zone_session_on_trip_complete(
    db: Session,
    *,
    driver_id: uuid.UUID,
    trip_id: uuid.UUID,
    trip_completed_at: datetime,
) -> None:
    """If driver has an open zone session with ``arrived_at`` set and this trip is
    the chronologically first completed trip at/after ``arrived_at``, close session
    and bump day budget (same transaction as trip completion).
    """
    if trip_completed_at.tzinfo is None:
        trip_completed_at = trip_completed_at.replace(tzinfo=timezone.utc)

    sess = (
        db.execute(
            select(DriverZoneSession)
            .where(
                and_(
                    DriverZoneSession.driver_id == driver_id,
                    DriverZoneSession.status == "open",
                    DriverZoneSession.arrived_at.is_not(None),
                    DriverZoneSession.first_completed_trip_id.is_(None),
                )
            )
            .with_for_update()
        )
        .scalars()
        .one_or_none()
    )
    if sess is None:
        return

    arrived = sess.arrived_at
    assert arrived is not None
    if arrived.tzinfo is None:
        arrived = arrived.replace(tzinfo=timezone.utc)
    if trip_completed_at < arrived:
        return

    earlier = (
        db.execute(
            select(Trip.id)
            .where(
                and_(
                    Trip.driver_id == driver_id,
                    Trip.status == TripStatus.completed,
                    Trip.id != trip_id,
                    Trip.completed_at.is_not(None),
                    Trip.completed_at >= arrived,
                    or_(
                        Trip.completed_at < trip_completed_at,
                        and_(
                            Trip.completed_at == trip_completed_at,
                            Trip.id < trip_id,
                        ),
                    ),
                )
            )
            .limit(1)
        )
        .scalar_one_or_none()
    )
    if earlier is not None:
        return

    sess.first_completed_trip_id = trip_id
    sess.first_completed_at = trip_completed_at
    sess.consume_reason = "completed_trip"
    sess.status = "consumed"
    service_day = sess.started_at.astimezone(ZONE_TZ).date()
    _increment_day_budget_used(db, driver_id=driver_id, service_date=service_day)
