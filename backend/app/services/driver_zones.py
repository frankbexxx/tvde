"""Driver «zone change» sessions and daily budget (v1).

Hook on trip completion (consume budget) is intentionally deferred.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.db.models.driver_zone_day_budget import DriverZoneDayBudget
from app.db.models.driver_zone_session import DriverZoneSession

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
