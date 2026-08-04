"""B2-CONFIG: next-trip Settings defaults (no runtime consumers)."""

from __future__ import annotations

from app.core.config import settings


def test_enable_next_trip_chaining_defaults_false() -> None:
    assert settings.ENABLE_NEXT_TRIP_CHAINING is False


def test_next_trip_max_pickup_eta_minutes_default_twelve() -> None:
    assert settings.NEXT_TRIP_MAX_PICKUP_ETA_MINUTES == 12
    assert isinstance(settings.NEXT_TRIP_MAX_PICKUP_ETA_MINUTES, int)
    assert settings.NEXT_TRIP_MAX_PICKUP_ETA_MINUTES >= 1
