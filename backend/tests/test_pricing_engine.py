"""A004: Pricing engine tests."""

import pytest
from app.core.config import settings
from app.core.pricing import calculate_price


def test_base_fare_applied():
    """TEST-PR-001: base fare applied when distance=0, time=0."""
    price = calculate_price(distance_km=0.0, duration_min=0.0)
    assert price == settings.BASE_FARE


def test_distance_pricing():
    """TEST-PR-002: price includes distance component."""
    price_0 = calculate_price(distance_km=0.0, duration_min=0.0)
    price_10 = calculate_price(distance_km=10.0, duration_min=0.0)
    expected_increase = 10.0 * settings.PRICE_PER_KM
    assert abs((price_10 - price_0) - expected_increase) < 0.01


def test_time_pricing():
    """TEST-PR-003: price includes time component."""
    price_0 = calculate_price(distance_km=0.0, duration_min=0.0)
    price_15 = calculate_price(distance_km=0.0, duration_min=15.0)
    expected_increase = 15.0 * settings.PRICE_PER_MIN
    assert abs((price_15 - price_0) - expected_increase) < 0.01
