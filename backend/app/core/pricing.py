"""
Pricing engine — category tariffs (A2.5) + Pet surcharge (PET-1).

Fare formula:
  raw = base + km×€/km + min×€/min
  fare_subtotal = max(raw, minimum_fare)
  total = fare_subtotal + pet_surcharge + tolls_amount

Tariff rates: ``app.core.tariffs`` (single source of truth).
Deprecated settings BASE_FARE / PRICE_PER_KM / PRICE_PER_MIN are **not** used
for category pricing (kept in config only as documented GO-shaped legacy env).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Mapping

from app.core.tariffs import (
    TARIFF_VERSION_V1,
    CategoryTariff,
    normalize_fare_category,
    resolve_tariff,
    tariff_from_snapshot,
)

COMMISSION_RATE = 0.15  # unused at runtime; commission from driver.commission_percent

PET_SURCHARGE_EUR = Decimal("1.50")
PET_SURCHARGE_RULE_V1 = "pet_surcharge_v1"


def _d(value: float | int | str | Decimal) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(str(value))


def money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class PriceBreakdown:
    """Explicit monetary breakdown (PET-1 + A2.5). Amounts in EUR, 2 dp."""

    category: str
    tariff_version: str
    base_fare: Decimal
    price_per_km: Decimal
    price_per_min: Decimal
    distance_amount: Decimal
    duration_amount: Decimal
    minimum_fare: Decimal
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
            category = normalize_fare_category(str(raw.get("category") or "x"))
            tariff = resolve_tariff(category)
            return cls(
                category=category,
                tariff_version=str(raw.get("tariff_version") or TARIFF_VERSION_V1),
                base_fare=money(_d(raw.get("base_fare", tariff.base_fare))),
                price_per_km=money(
                    _d(raw["price_per_km"])
                    if "price_per_km" in raw
                    else tariff.price_per_km
                ),
                price_per_min=money(
                    _d(raw["price_per_min"])
                    if "price_per_min" in raw
                    else tariff.price_per_min
                ),
                distance_amount=money(_d(raw["distance_amount"])),
                duration_amount=money(_d(raw["duration_amount"])),
                minimum_fare=money(
                    _d(raw["minimum_fare"])
                    if "minimum_fare" in raw
                    else tariff.minimum_fare
                ),
                minimum_fare_adjustment=money(
                    _d(raw.get("minimum_fare_adjustment", 0))
                ),
                pet_surcharge=money(_d(raw.get("pet_surcharge", 0))),
                tolls_amount=money(_d(raw.get("tolls_amount", 0))),
                fare_subtotal=money(_d(raw["fare_subtotal"])),
                total=money(_d(raw["total"])),
                pet_surcharge_rule=str(
                    raw.get("pet_surcharge_rule") or PET_SURCHARGE_RULE_V1
                ),
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


def commissionable_amount(
    total: Decimal | float | int | str,
    tolls_amount: Decimal | float | int | str = 0,
) -> Decimal:
    """Amount subject to platform commission (excludes tolls; includes Pet)."""
    base = money(_d(total) - _d(tolls_amount))
    if base < Decimal("0.00"):
        return money(Decimal("0.00"))
    return base


def calculate_commission_amount(
    total: Decimal | float | int | str,
    commission_rate: Decimal | float | int | str,
    *,
    tolls_amount: Decimal | float | int | str = 0,
) -> Decimal:
    """``commissionable_amount × rate`` (tolls excluded from base)."""
    return money(commissionable_amount(total, tolls_amount) * _d(commission_rate))


def calculate_fare_breakdown(
    distance_km: float,
    duration_min: float,
    *,
    category: str | None = None,
    tariff: CategoryTariff | None = None,
    pet_surcharge: Decimal | float | int = 0,
    tolls_amount: Decimal | float | int = 0,
    pet_surcharge_rule: str = PET_SURCHARGE_RULE_V1,
) -> PriceBreakdown:
    """Build fare + extras breakdown for a fare category (A2.5)."""
    resolved = tariff or resolve_tariff(category)
    cat = normalize_fare_category(resolved.category)
    base = money(resolved.base_fare)
    per_km = money(resolved.price_per_km)
    per_min = money(resolved.price_per_min)
    minimum = money(resolved.minimum_fare)
    dist = money(per_km * _d(distance_km))
    dur = money(per_min * _d(duration_min))
    raw = money(base + dist + dur)
    if raw < minimum:
        fare_subtotal = minimum
        min_adj = money(minimum - raw)
    else:
        fare_subtotal = raw
        min_adj = money(Decimal("0.00"))
    pet = money(_d(pet_surcharge))
    tolls = money(_d(tolls_amount))
    total = money(fare_subtotal + pet + tolls)
    return PriceBreakdown(
        category=cat,
        tariff_version=resolved.tariff_version,
        base_fare=base,
        price_per_km=per_km,
        price_per_min=per_min,
        distance_amount=dist,
        duration_amount=dur,
        minimum_fare=minimum,
        minimum_fare_adjustment=min_adj,
        pet_surcharge=pet,
        tolls_amount=tolls,
        fare_subtotal=fare_subtotal,
        total=total,
        pet_surcharge_rule=pet_surcharge_rule,
    )


def calculate_price(
    distance_km: float,
    duration_min: float,
    *,
    category: str | None = None,
) -> float:
    """Fare subtotal without Pet (float). Defaults to GO."""
    return float(
        calculate_fare_breakdown(
            distance_km, duration_min, category=category
        ).fare_subtotal
    )


def resolve_trip_tariff(
    *,
    category: str | None,
    price_breakdown: Mapping[str, Any] | None = None,
) -> CategoryTariff:
    """Prefer snapshotted rates on the trip; else current V1 table for category."""
    snapped = tariff_from_snapshot(price_breakdown)
    if snapped is not None:
        return snapped
    return resolve_tariff(category)


def calculate_driver_payout(total: float) -> float:
    """UNUSED: commission from driver.commission_percent."""
    payout = total * (1 - COMMISSION_RATE)
    return round(payout, 2)
