from datetime import datetime, timezone

from app.services.partner_time import get_today_range_utc


def test_get_today_range_utc_bounds() -> None:
    now = datetime(2026, 3, 15, 14, 30, tzinfo=timezone.utc)
    start, end = get_today_range_utc(now)
    assert start == datetime(2026, 3, 15, 0, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 3, 16, 0, 0, tzinfo=timezone.utc)
    assert start < now < end
