"""UTC time boundaries for partner reporting. Extend later with per-partner IANA timezones."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def get_today_range_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    """
    Return the current UTC calendar day as [day_start, next_day_start).

    All partner trip counts today use this window until we store a timezone per partner
    and interpret "today" in local fleet time.
    """
    now = now if now is not None else datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    else:
        now = now.astimezone(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    return day_start, day_end
