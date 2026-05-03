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
from app.services.partner_queries import get_driver_for_partner
from app.utils.logging import log_event

ZONE_TZ = ZoneInfo("Europe/Lisbon")


def service_date_local_now() -> date:
    return datetime.now(ZONE_TZ).date()


def get_open_zone_session(db: Session, *, driver_id: uuid.UUID) -> DriverZoneSession | None:
    """Latest session with ``status == open`` for this driver (at most one in v1)."""
    return (
        db.execute(
            select(DriverZoneSession)
            .where(
                and_(
                    DriverZoneSession.driver_id == driver_id,
                    DriverZoneSession.status == "open",
                )
            )
            .order_by(DriverZoneSession.started_at.desc())
            .limit(1)
        )
        .scalars()
        .first()
    )


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


def request_zone_session_extension(
    db: Session,
    *,
    driver_id: uuid.UUID,
    session_id: uuid.UUID,
    reason: str,
) -> DriverZoneSession:
    """Driver asks partner for more time before ``deadline_at`` (v1).

    Sets ``extension_requested`` + ``extension_reason``. Partner approves via
    ``approve_zone_session_extension`` which extends ``deadline_at``.
    """
    text = (reason or "").strip()
    if len(text) < 3:
        raise ValueError("extension_reason_too_short")

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
    if sess.extension_requested and sess.extension_seconds_approved is None:
        raise ValueError("extension_pending")
    if sess.extension_seconds_approved is not None:
        raise ValueError("extension_already_used")
    sess.extension_requested = True
    sess.extension_reason = text[:2000]
    log_event(
        "driver_zone_session_extension_requested",
        session_id=str(sess.id),
        driver_id=str(driver_id),
    )
    return sess


def approve_zone_session_extension(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    session_id: uuid.UUID,
    extra_seconds: int,
    partner_actor_user_id: uuid.UUID,
) -> DriverZoneSession:
    """Partner approves extra seconds; extends ``deadline_at`` (v1, once per session)."""
    if extra_seconds <= 0 or extra_seconds > 86400 * 2:
        raise ValueError("extension_extra_seconds_invalid")

    drv = get_driver_for_partner(db, partner_id, driver_user_id)
    if drv is None:
        raise ValueError("driver_not_found_for_partner")

    sess = (
        db.execute(
            select(DriverZoneSession)
            .where(
                and_(
                    DriverZoneSession.id == session_id,
                    DriverZoneSession.driver_id == driver_user_id,
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
    if not sess.extension_requested:
        raise ValueError("extension_not_requested")
    if sess.extension_seconds_approved is not None:
        raise ValueError("extension_already_approved")

    sess.extension_seconds_approved = int(extra_seconds)
    sess.approved_by_partner_user_id = partner_actor_user_id
    sess.deadline_at = sess.deadline_at + timedelta(seconds=int(extra_seconds))
    log_event(
        "driver_zone_session_extension_approved",
        session_id=str(sess.id),
        driver_id=str(driver_user_id),
        partner_id=partner_id,
        extra_seconds=extra_seconds,
    )
    return sess


def expire_open_zone_sessions_past_deadline(
    db: Session,
    *,
    now: datetime | None = None,
) -> int:
    """Close ``open`` zone sessions whose ``deadline_at`` is in the past.

    Sets ``status`` to ``expired`` and ``cancel_reason`` to ``deadline_passed``.
    Commits only when at least one row was updated (same pattern as trip timeouts).
    """
    utc_now = now or datetime.now(timezone.utc)
    rows = (
        db.execute(
            select(DriverZoneSession).where(
                and_(
                    DriverZoneSession.status == "open",
                    DriverZoneSession.deadline_at < utc_now,
                )
            )
        )
        .scalars()
        .all()
    )
    for row in rows:
        row.status = "expired"
        row.cancel_reason = "deadline_passed"
    if rows:
        db.commit()
        log_event(
            "driver_zone_sessions_expired",
            count=len(rows),
        )
    return len(rows)
