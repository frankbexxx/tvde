"""GPS freshness shared by offer dispatch and driver matching eligibility.

The comparison lives here so a status read cannot use a different clock
or a different 45-second window from ``create_offers_for_trip``.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings

LOCATION_MAX_AGE_SECONDS = getattr(settings, "LOCATION_MAX_AGE_SECONDS", 45)


def location_age_seconds(timestamp: datetime, *, now: datetime | None = None) -> float:
    """Seconds between a stored fix and ``now`` (naive timestamps are UTC)."""
    now_utc = now or datetime.now(timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    loc_ts = timestamp
    if loc_ts.tzinfo is None:
        loc_ts = loc_ts.replace(tzinfo=timezone.utc)
    return (now_utc - loc_ts).total_seconds()


def location_is_fresh_for_matching(
    timestamp: datetime, *, now: datetime | None = None
) -> bool:
    """True when dispatch would keep this fix. Boundary is inclusive (<=)."""
    return location_age_seconds(timestamp, now=now) <= LOCATION_MAX_AGE_SECONDS
