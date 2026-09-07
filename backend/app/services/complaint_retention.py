"""L-12 retention: submitted_at + 2 calendar years (never shorter via leap-day)."""

from __future__ import annotations

from datetime import datetime


def add_calendar_years(dt: datetime, years: int) -> datetime:
    """Add whole calendar years. Feb 29 → Mar 1 when target year is not leap."""
    try:
        return dt.replace(year=dt.year + years)
    except ValueError:
        # 29 Feb → non-leap target: use 1 Mar (never shortens vs Feb 28)
        return dt.replace(year=dt.year + years, month=3, day=1)


def compute_retention_until(submitted_at: datetime) -> datetime:
    """Backend-only retention clock for complaints (L-12)."""
    return add_calendar_years(submitted_at, 2)
