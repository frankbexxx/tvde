"""A004 / A2.5: Pricing engine tests (category tariffs)."""

from app.core.pricing import calculate_price
from app.core.tariffs import TARIFF_GO


def test_base_fare_respects_go_minimum():
    """Zero distance/time → GO minimum fare (not bare base)."""
    price = calculate_price(distance_km=0.0, duration_min=0.0, category="x")
    assert price == float(TARIFF_GO.minimum_fare)


def test_distance_pricing_go():
    price_0 = calculate_price(distance_km=0.0, duration_min=0.0, category="x")
    # Above minimum: 1.50 + 10*0.60 = 7.50
    price_10 = calculate_price(distance_km=10.0, duration_min=0.0, category="x")
    assert price_0 == 4.50
    assert abs(price_10 - 7.50) < 0.01


def test_time_pricing_go():
    # 1.50 + 15*0.12 = 3.30 → minimum 4.50
    price_15 = calculate_price(distance_km=0.0, duration_min=15.0, category="x")
    assert price_15 == 4.50
    # Clear of minimum: 1.50 + 40*0.12 = 6.30
    price_40 = calculate_price(distance_km=0.0, duration_min=40.0, category="x")
    assert abs(price_40 - 6.30) < 0.01
