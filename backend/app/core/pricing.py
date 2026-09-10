"""
Pricing engine — fare components + optional Pet surcharge (PET-1).

Fare formula (unchanged):
  fare_subtotal = BASE_FARE + PRICE_PER_KM*km + PRICE_PER_MIN*min

Pet surcharge is additive and never folded into the base fare.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from app.core.config import settings

COMMISSION_RATE = 0.15  # unused at runtime; commission from driver.commission_percent

PET_SURCHARGE_EUR = Decimal("1.50")
PET_SURCHARGE_RULE_V1 = "pet_surcharge_v1"


def _d(value: float | int | str | Decimal) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(str(value))


def money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class PriceBreakdown:
    """Explicit monetary breakdown (PET-1). Amounts in EUR, 2 dp."""

    base_fare: Decimal
    distance_amount: Decimal
    duration_amount: Decimal
    minimum_fare_adjustment: Decimal
    pet_surcharge: Decimal
    tolls_amount: Decimal
    fare_subtotal: Decimal
    total: Decimal
    pet_surcharge_rule: str

    def to_json_dict(self) -> dict[str, Any]:
        d = asdict(self)
        out: dict[str, Any] = {}
        for k, v in d.items():
            if isinstance(v, Decimal):
                out[k] = float(money(v))
            else:
                out[k] = v
        return out

    @classmethod
    def from_json_dict(cls, raw: dict[str, Any] | None) -> PriceBreakdown | None:
        if not raw:
            return None
        try:
            return cls(
                base_fare=money(_d(raw["base_fare"])),
                distance_amount=money(_d(raw["distance_amount"])),
                duration_amount=money(_d(raw["duration_amount"])),
                minimum_fare_adjustment=money(_d(raw.get("minimum_fare_adjustment", 0))),
                pet_surcharge=money(_d(raw.get("pet_surcharge", 0))),
                tolls_amount=money(_d(raw.get("tolls_amount", 0))),
                fare_subtotal=money(_d(raw["fare_subtotal"])),
                total=money(_d(raw["total"])),
                pet_surcharge_rule=str(raw.get("pet_surcharge_rule") or PET_SURCHARGE_RULE_V1),
            )
        except (KeyError, TypeError, ValueError):
            return None


def calculate_pet_surcharge(
    *,
    has_pet: bool,
    is_assistance_animal: bool,
) -> Decimal:
    """Canonical Pet surcharge (flat EUR). Assistance → 0. No percentage."""
    if is_assistance_animal:
        return money(Decimal("0.00"))
    if has_pet:
        return money(PET_SURCHARGE_EUR)
    return money(Decimal("0.00"))


def calculate_fare_breakdown(
    distance_km: float,
    duration_min: float,
    *,
    pet_surcharge: Decimal | float | int = 0,
    tolls_amount: Decimal | float | int = 0,
    pet_surcharge_rule: str = PET_SURCHARGE_RULE_V1,
) -> PriceBreakdown:
    """Build fare + extras breakdown. Does not apply category tariffs (A2.5 later)."""
    base = money(_d(settings.BASE_FARE))
    dist = money(_d(settings.PRICE_PER_KM) * _d(distance_km))
    dur = money(_d(settings.PRICE_PER_MIN) * _d(duration_min))
    min_adj = money(Decimal("0.00"))  # category minimums → later
    fare_subtotal = money(base + dist + dur + min_adj)
    pet = money(_d(pet_surcharge))
    tolls = money(_d(tolls_amount))
    total = money(fare_subtotal + pet + tolls)
    return PriceBreakdown(
        base_fare=base,
        distance_amount=dist,
        duration_amount=dur,
        minimum_fare_adjustment=min_adj,
        pet_surcharge=pet,
        tolls_amount=tolls,
        fare_subtotal=fare_subtotal,
        total=total,
        pet_surcharge_rule=pet_surcharge_rule,
    )


def calculate_price(distance_km: float, duration_min: float) -> float:
    """Backward-compatible total fare without Pet (float). Prefer calculate_fare_breakdown."""
    return float(calculate_fare_breakdown(distance_km, duration_min).fare_subtotal)


def calculate_driver_payout(total: float) -> float:
    """UNUSED: commission from driver.commission_percent."""
    payout = total * (1 - COMMISSION_RATE)
    return round(payout, 2)
