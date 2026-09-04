"""Driving-hours compliance — rolling 24h window (UTC).

TEMPORARY_POLICY_PENDING_LEGAL_CONFIRMATION
-------------------------------------------
Counted segments today: **arriving + ongoing** only
(``accepted → arriving`` opens a segment; leave arriving/ongoing closes it).

This is a **provisional product policy**, not a final legal definition of
“tempo de operação”. Online / waiting / pause / other states are **not**
counted until a future decision.

Window: ``[now - 24h, now]`` in UTC (no Europe/Lisbon civil-day reset).
Automatic fixed 11h rest after hitting 10h was **removed** (not required by
statute; not current TVDE policy). ``Driver.driving_rest_until`` remains as
**legacy** (historical / deprecated admin override): exposed as
``legacy_rest_active`` / ``rest_until`` and may audit
``driving_hours.legacy_rest_detected``, but **must not** affect
``limit_reached``, remaining time, or operational eligibility.

Enforcement: ``ENABLE_DRIVING_HOURS_ENFORCEMENT`` default **False** (WARN+RECORD).
Cross-platform / IMT: out of scope here.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.trip import Trip
from app.models.enums import TripStatus

# --- Policy constants (provisional) ---
# TEMPORARY_POLICY_PENDING_LEGAL_CONFIRMATION: only arriving+ongoing segments count.
COUNTED_SEGMENT_POLICY = "TEMPORARY_POLICY_PENDING_LEGAL_CONFIRMATION:arriving+ongoing"

ROLLING_WINDOW_SEC = 24 * 3600
MAX_ACTIVE_DRIVING_SEC = 10 * 3600
WARNING_ACTIVE_DRIVING_SEC = 8 * 3600


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


def _as_utc(instant: datetime) -> datetime:
    if instant.tzinfo is None:
        return instant.replace(tzinfo=timezone.utc)
    return instant.astimezone(timezone.utc)


def rolling_24h_bounds_utc(reference_utc: datetime) -> tuple[datetime, datetime]:
    """Return ``[reference - 24h, reference]`` in UTC (closed at reference for open segments)."""
    ref = _as_utc(reference_utc)
    return ref - timedelta(seconds=ROLLING_WINDOW_SEC), ref


def active_driving_seconds_in_rolling_24h(
    db: Session,
    driver_user_id: uuid.UUID,
    reference_utc: datetime,
) -> float:
    """Sum overlap of closed + open segments with the rolling 24h window ending at reference_utc."""
    win_start, win_end = rolling_24h_bounds_utc(reference_utc)
    rows = (
        db.execute(
            select(DriverActiveDrivingSegment).where(
                DriverActiveDrivingSegment.driver_id == driver_user_id,
                DriverActiveDrivingSegment.started_at < win_end,
                or_(
                    DriverActiveDrivingSegment.ended_at.is_(None),
                    DriverActiveDrivingSegment.ended_at > win_start,
                ),
            )
        )
        .scalars()
        .all()
    )
    total = 0.0
    for seg in rows:
        seg_end = seg.ended_at if seg.ended_at is not None else win_end
        total += overlap_seconds_utc(
            _as_utc(seg.started_at),
            _as_utc(seg_end),
            win_start,
            win_end,
        )
    return total


# Back-compat alias for any residual imports (calendar-day helper removed from policy).
def active_driving_seconds_in_lisbon_day(
    db: Session,
    driver_user_id: uuid.UUID,
    reference_utc: datetime,
) -> float:
    """Deprecated alias → rolling 24h. Do not use in new code."""
    return active_driving_seconds_in_rolling_24h(db, driver_user_id, reference_utc)


def driver_compliance_snapshot(
    db: Session,
    driver_user_id: uuid.UUID | str,
    now_utc: datetime | None = None,
) -> dict:
    """
    Snapshot for UI / guards.

    - ``active_seconds_today``: seconds in rolling 24h (API name kept for FE compat).
    - ``limit_reached``: **only** rolling total ≥ 10h (legal 10h/24h). Never from
      legacy ``driving_rest_until`` / admin rest override.
    - ``legacy_rest_active``: informational only (deprecated field still set).
    - ``blocked_accept``: True only if limit_reached **and** ENABLE_DRIVING_HOURS_ENFORCEMENT.
    """
    if not settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        return {
            "enabled": False,
            "enforcement_enabled": False,
            "active_seconds_today": 0,
            "max_seconds": MAX_ACTIVE_DRIVING_SEC,
            "warning_threshold_seconds": WARNING_ACTIVE_DRIVING_SEC,
            "warning": False,
            "limit_reached": False,
            "blocked_accept": False,
            "rest_until": None,
            "legacy_rest_active": False,
            "window_seconds": ROLLING_WINDOW_SEC,
            "counted_policy": COUNTED_SEGMENT_POLICY,
        }

    driver_uuid = uuid.UUID(str(driver_user_id))
    now = _as_utc(now_utc or datetime.now(timezone.utc))

    driver = db.execute(select(Driver).where(Driver.user_id == driver_uuid)).scalar_one_or_none()
    rest_until = driver.driving_rest_until if driver else None

    active_sec = active_driving_seconds_in_rolling_24h(db, driver_uuid, now)
    legacy_rest_active = False
    if rest_until is not None:
        legacy_rest_active = now < _as_utc(rest_until)
    # Legal eligibility: rolling 24h only — never legacy rest.
    limit_reached = active_sec >= MAX_ACTIVE_DRIVING_SEC
    enforcement = bool(settings.ENABLE_DRIVING_HOURS_ENFORCEMENT)
    blocked = limit_reached and enforcement
    warning = (
        not limit_reached
        and active_sec >= WARNING_ACTIVE_DRIVING_SEC
        and active_sec < MAX_ACTIVE_DRIVING_SEC
    )

    return {
        "enabled": True,
        "enforcement_enabled": enforcement,
        "active_seconds_today": int(active_sec),
        "max_seconds": MAX_ACTIVE_DRIVING_SEC,
        "warning_threshold_seconds": WARNING_ACTIVE_DRIVING_SEC,
        "warning": warning,
        "limit_reached": limit_reached,
        "blocked_accept": blocked,
        "rest_until": rest_until,
        "legacy_rest_active": legacy_rest_active,
        "window_seconds": ROLLING_WINDOW_SEC,
        "counted_policy": COUNTED_SEGMENT_POLICY,
    }


def _record_driving_hours_audit(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    event_type: str,
    payload: dict,
    occurred_at: datetime,
) -> None:
    db.add(
        AuditEvent(
            event_type=event_type[:64],
            entity_type="driver",
            entity_id=str(driver_user_id)[:64],
            payload=payload,
            occurred_at=_as_utc(occurred_at),
        )
    )


def _snapshot_audit_payload(snap: dict) -> dict:
    return {
        "active_seconds": snap.get("active_seconds_today"),
        "max_seconds": snap.get("max_seconds"),
        "warning": snap.get("warning"),
        "limit_reached": snap.get("limit_reached"),
        "legacy_rest_active": snap.get("legacy_rest_active"),
        "rest_until": snap["rest_until"].isoformat() if snap.get("rest_until") else None,
        "enforcement_enabled": snap.get("enforcement_enabled"),
        "window_seconds": snap.get("window_seconds"),
        "counted_policy": snap.get("counted_policy"),
    }


def audit_compliance_transitions(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    before: dict,
    after: dict,
    at: datetime,
    trigger: str,
) -> None:
    """Emit audit only on relevant state transitions (no per-poll spam)."""
    if not settings.ENABLE_DRIVING_HOURS_COMPLIANCE:
        return
    if not before.get("enabled") and not after.get("enabled"):
        return

    base = {
        "trigger": trigger,
        "before": _snapshot_audit_payload(before),
        "after": _snapshot_audit_payload(after),
    }

    if not before.get("warning") and after.get("warning"):
        _record_driving_hours_audit(
            db,
            driver_user_id=driver_user_id,
            event_type="driving_hours.warning_reached",
            payload=base,
            occurred_at=at,
        )

    if not before.get("limit_reached") and after.get("limit_reached"):
        _record_driving_hours_audit(
            db,
            driver_user_id=driver_user_id,
            event_type="driving_hours.limit_reached",
            payload=base,
            occurred_at=at,
        )

    if before.get("limit_reached") and not after.get("limit_reached"):
        _record_driving_hours_audit(
            db,
            driver_user_id=driver_user_id,
            event_type="driving_hours.limit_cleared",
            payload=base,
            occurred_at=at,
        )

    if after.get("legacy_rest_active") and not before.get("legacy_rest_active"):
        _record_driving_hours_audit(
            db,
            driver_user_id=driver_user_id,
            event_type="driving_hours.legacy_rest_detected",
            payload=base,
            occurred_at=at,
        )


def open_active_driving_segment(
    db: Session,
    *,
    driver_id: uuid.UUID,
    trip_id: uuid.UUID,
    at: datetime,
) -> None:
    at = _as_utc(at)
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
    at = _as_utc(at)
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
    """No-op.

    Legacy: previously set ``driving_rest_until = closed_at + 11h`` when the
    civil-day total hit 10h. That fixed rest is **not** current TVDE policy and
    must not be reintroduced. Kept as a stub so call sites stay harmless.
    """
    del db, driver_user_id, closed_at
    return


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

    at = _as_utc(at or datetime.now(timezone.utc))
    driver_uuid = trip.driver_id

    opens = new_status == TripStatus.arriving and old_status == TripStatus.accepted
    closes = old_status in (TripStatus.arriving, TripStatus.ongoing) and new_status in (
        TripStatus.completed,
        TripStatus.cancelled,
        TripStatus.failed,
    )
    if not opens and not closes:
        return

    before = driver_compliance_snapshot(db, driver_uuid, now_utc=at)

    if opens:
        open_active_driving_segment(
            db,
            driver_id=driver_uuid,
            trip_id=trip.id,
            at=at,
        )
    else:
        close_active_driving_segment(db, trip_id=trip.id, at=at)
        # Explicitly do not apply fixed 11h rest (stub no-op).
        maybe_apply_rest_after_segment_close(db, driver_user_id=driver_uuid, closed_at=at)

    # Flush so subsequent SELECT sees the open/closed segment in this transaction.
    db.flush()
    after = driver_compliance_snapshot(db, driver_uuid, now_utc=at)
    audit_compliance_transitions(
        db,
        driver_user_id=driver_uuid,
        before=before,
        after=after,
        at=at,
        trigger=f"trip_status:{old_status.value}->{new_status.value}",
    )


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
