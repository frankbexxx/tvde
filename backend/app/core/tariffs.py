"""Canonical V1 category tariffs (A2.5).

Single source of truth for GO / Comfort / XL fare rates.
Future ``TariffVersion`` can wrap this table; do not scatter rates elsewhere.

Legacy / unsupported fare categories (``black``, ``electric``, ``van``, unknown)
resolve to GO with the same rates — documented safe default, not a new product tariff.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Mapping

TARIFF_VERSION_V1 = "v1"

# Commercial labels (reporting / UX)
CATEGORY_LABELS: Mapping[str, str] = {
    "x": "GO",
    "comfort": "Comfort",
    "xl": "XL",
}


@dataclass(frozen=True)
class CategoryTariff:
    """Immutable fare rates for one category (EUR)."""

    category: str
    base_fare: Decimal
    price_per_km: Decimal
    price_per_min: Decimal
    minimum_fare: Decimal
    tariff_version: str = TARIFF_VERSION_V1

    @property
    def label(self) -> str:
        return CATEGORY_LABELS.get(self.category, self.category.upper())


def _t(
    category: str,
    base: str,
    per_km: str,
    per_min: str,
    minimum: str,
) -> CategoryTariff:
    return CategoryTariff(
        category=category,
        base_fare=Decimal(base),
        price_per_km=Decimal(per_km),
        price_per_min=Decimal(per_min),
        minimum_fare=Decimal(minimum),
        tariff_version=TARIFF_VERSION_V1,
    )


# --- V1 pilot tariffs (human decision 2026-09-11) ---
TARIFF_GO = _t("x", "1.50", "0.60", "0.12", "4.50")
TARIFF_COMFORT = _t("comfort", "1.90", "0.85", "0.15", "5.50")
TARIFF_XL = _t("xl", "3.00", "1.05", "0.15", "6.50")

TARIFFS_V1: Mapping[str, CategoryTariff] = {
    TARIFF_GO.category: TARIFF_GO,
    TARIFF_COMFORT.category: TARIFF_COMFORT,
    TARIFF_XL.category: TARIFF_XL,
}

# Categories with an explicit V1 tariff
PRICED_FARE_CATEGORIES = frozenset(TARIFFS_V1.keys())

# Accepted on trips/matching but no dedicated tariff → GO fallback
UNSUPPORTED_FARE_FALLBACK_GO = frozenset({"black", "electric", "van"})


def normalize_fare_category(category: str | None) -> str:
    """Map stored / request category to a fare key.

    - ``None`` / empty → ``x`` (GO)
    - ``pet`` legacy → ``x``
    - ``black`` / ``electric`` / ``van`` → ``x`` (safe default; no dedicated tariff)
    - unknown → ``x``
    """
    raw = (category or "x").strip().lower()
    if raw == "pet" or raw == "":
        return "x"
    if raw in PRICED_FARE_CATEGORIES:
        return raw
    if raw in UNSUPPORTED_FARE_FALLBACK_GO:
        return "x"
    return "x"


def resolve_tariff(category: str | None) -> CategoryTariff:
    """Return the V1 tariff for a fare category (always a known GO/Comfort/XL row)."""
    key = normalize_fare_category(category)
    return TARIFFS_V1[key]


def tariff_from_snapshot(raw: Mapping[str, object] | None) -> CategoryTariff | None:
    """Rebuild rates from a persisted price_breakdown snapshot when complete.

    Requires base_fare, price_per_km, price_per_min, minimum_fare, category.
    Returns None → caller should ``resolve_tariff``.
    """
    if not raw:
        return None
    try:
        category = normalize_fare_category(str(raw.get("category") or "x"))
        base = Decimal(str(raw["base_fare"]))
        per_km = Decimal(str(raw["price_per_km"]))
        per_min = Decimal(str(raw["price_per_min"]))
        minimum = Decimal(str(raw["minimum_fare"]))
        version = str(raw.get("tariff_version") or TARIFF_VERSION_V1)
        return CategoryTariff(
            category=category,
            base_fare=base,
            price_per_km=per_km,
            price_per_min=per_min,
            minimum_fare=minimum,
            tariff_version=version,
        )
    except (KeyError, TypeError, ValueError, ArithmeticError):
        return None
