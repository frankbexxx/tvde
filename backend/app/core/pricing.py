"""
Pricing engine — modelo económico determinístico.
Valores arredondados a 2 casas decimais.
Uses BASE_FARE, PRICE_PER_KM, PRICE_PER_MIN from config.
"""

from app.core.config import settings


def calculate_price(distance_km: float, duration_min: float) -> float:
    """Calculate total trip price from distance and duration."""
    d = float(distance_km)
    t = float(duration_min)
    total = (
        float(settings.BASE_FARE)
        + (float(settings.PRICE_PER_KM) * d)
        + (float(settings.PRICE_PER_MIN) * t)
    )
    return round(total, 2)


# Not used: commission comes from driver.commission_percent in DB.
COMMISSION_RATE = 0.15


def calculate_driver_payout(total: float) -> float:
    """Calculate driver share after commission. UNUSED: commission from driver.commission_percent."""
    payout = total * (1 - COMMISSION_RATE)
    return round(payout, 2)
