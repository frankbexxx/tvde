"""A004: OSRM pricing tests."""

import pytest

from app.services.osrm import get_route_distance_duration


def test_osrm_returns_none_when_not_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    """When OSRM_BASE_URL is not set, returns None (Haversine fallback)."""
    monkeypatch.setattr("app.services.osrm.settings", type("S", (), {"OSRM_BASE_URL": None})())
    result = get_route_distance_duration(38.7, -9.1, 38.8, -9.2)
    assert result is None


def test_osrm_returns_distance_duration_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    """When OSRM_BASE_URL points to public demo, returns real road distance/duration."""
    monkeypatch.setattr(
        "app.services.osrm.settings",
        type("S", (), {"OSRM_BASE_URL": "https://router.project-osrm.org"})(),
    )
    result = get_route_distance_duration(38.7, -9.1, 38.8, -9.2)
    if result is None:
        pytest.skip("OSRM demo may be unavailable")
    distance_km, duration_min = result
    assert distance_km > 0
    assert duration_min > 0
    assert distance_km < 50  # Lisbon area
    assert duration_min < 60
