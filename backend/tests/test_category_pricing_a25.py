"""A2.5 — Category tariffs GO / Comfort / XL + minimum fare + toll commission."""

from __future__ import annotations

from decimal import Decimal

from app.core.pricing import (
    PET_SURCHARGE_EUR,
    calculate_commission_amount,
    calculate_fare_breakdown,
    calculate_pet_surcharge,
    calculate_price,
    commissionable_amount,
    money,
    resolve_trip_tariff,
)
from app.core.tariffs import (
    TARIFF_COMFORT,
    TARIFF_GO,
    TARIFF_VERSION_V1,
    TARIFF_XL,
    normalize_fare_category,
    resolve_tariff,
)


def test_tariff_source_of_truth_values() -> None:
    assert TARIFF_GO.base_fare == Decimal("1.50")
    assert TARIFF_GO.price_per_km == Decimal("0.60")
    assert TARIFF_GO.price_per_min == Decimal("0.12")
    assert TARIFF_GO.minimum_fare == Decimal("4.50")
    assert TARIFF_COMFORT.minimum_fare == Decimal("5.50")
    assert TARIFF_XL.base_fare == Decimal("3.00")
    assert TARIFF_XL.minimum_fare == Decimal("6.50")


def test_normalize_legacy_and_unsupported() -> None:
    assert normalize_fare_category(None) == "x"
    assert normalize_fare_category("pet") == "x"
    assert normalize_fare_category("black") == "x"
    assert normalize_fare_category("electric") == "x"
    assert normalize_fare_category("van") == "x"
    assert normalize_fare_category("comfort") == "comfort"
    assert resolve_tariff("black").category == "x"


def test_go_mandatory_scenarios() -> None:
    assert calculate_price(2, 8, category="x") == 4.50
    assert calculate_price(5, 15, category="x") == 6.30
    assert calculate_price(10, 25, category="x") == 10.50


def test_comfort_mandatory_scenarios() -> None:
    assert calculate_price(2, 8, category="comfort") == 5.50
    assert calculate_price(5, 15, category="comfort") == 8.40
    assert calculate_price(10, 25, category="comfort") == 14.15


def test_xl_mandatory_scenarios() -> None:
    assert calculate_price(2, 8, category="xl") == 6.50
    assert calculate_price(5, 15, category="xl") == 10.50
    assert calculate_price(10, 25, category="xl") == 17.25


def test_minimum_adjustments() -> None:
    go = calculate_fare_breakdown(2, 8, category="x")
    assert go.fare_subtotal == Decimal("4.50")
    assert go.minimum_fare_adjustment == Decimal("0.84")  # 4.50 - 3.66
    comfort = calculate_fare_breakdown(2, 8, category="comfort")
    assert comfort.minimum_fare_adjustment == Decimal("0.70")
    xl = calculate_fare_breakdown(2, 8, category="xl")
    assert xl.minimum_fare_adjustment == Decimal("0.20")
    long_go = calculate_fare_breakdown(10, 25, category="x")
    assert long_go.minimum_fare_adjustment == Decimal("0.00")


def test_pet_and_assistance_per_category() -> None:
    for cat in ("x", "comfort", "xl"):
        with_pet = calculate_fare_breakdown(
            5, 15, category=cat, pet_surcharge=PET_SURCHARGE_EUR
        )
        bare = calculate_fare_breakdown(5, 15, category=cat)
        assert with_pet.total == money(bare.fare_subtotal + Decimal("1.50"))
        assist = calculate_pet_surcharge(has_pet=True, is_assistance_animal=True)
        assert assist == Decimal("0.00")
        no_pet = calculate_fare_breakdown(5, 15, category=cat, pet_surcharge=assist)
        assert no_pet.total == bare.total


def test_commission_excludes_tolls_includes_pet() -> None:
    bd = calculate_fare_breakdown(
        5,
        15,
        category="x",
        pet_surcharge=PET_SURCHARGE_EUR,
        tolls_amount=Decimal("2.00"),
    )
    # fare 6.30 + pet 1.50 + tolls 2.00 = 9.80
    assert bd.total == Decimal("9.80")
    assert commissionable_amount(bd.total, bd.tolls_amount) == Decimal("7.80")
    commission = calculate_commission_amount(
        bd.total, Decimal("0.15"), tolls_amount=bd.tolls_amount
    )
    assert commission == money(Decimal("7.80") * Decimal("0.15"))
    # Without tolls, same commissionable base
    no_toll = calculate_fare_breakdown(
        5, 15, category="x", pet_surcharge=PET_SURCHARGE_EUR
    )
    assert calculate_commission_amount(no_toll.total, Decimal("0.15")) == money(
        no_toll.total * Decimal("0.15")
    )


def test_snapshot_rates_survive_tariff_lookup() -> None:
    snap = calculate_fare_breakdown(2, 8, category="comfort").to_json_dict()
    assert snap["category"] == "comfort"
    assert snap["tariff_version"] == TARIFF_VERSION_V1
    assert snap["price_per_km"] == 0.85
    assert snap["minimum_fare"] == 5.50
    # Simulate future table change: still use snapshotted rates on complete path
    tariff = resolve_trip_tariff(category="comfort", price_breakdown=snap)
    assert tariff.price_per_km == Decimal("0.85")
    assert tariff.minimum_fare == Decimal("5.50")
    # Different metrics, same rates
    final = calculate_fare_breakdown(5, 15, tariff=tariff, category="comfort")
    assert final.fare_subtotal == Decimal("8.40")
    assert final.category == "comfort"


def test_legacy_null_category_defaults_go() -> None:
    bd = calculate_fare_breakdown(2, 8, category=None)
    assert bd.category == "x"
    assert bd.fare_subtotal == Decimal("4.50")


def test_breakdown_json_roundtrip_legacy_without_rates() -> None:
    """Old PET-1 snapshots without price_per_km remain readable."""
    from app.core.pricing import PriceBreakdown

    legacy = {
        "base_fare": 1.5,
        "distance_amount": 1.2,
        "duration_amount": 0.96,
        "minimum_fare_adjustment": 0.84,
        "pet_surcharge": 0.0,
        "tolls_amount": 0.0,
        "fare_subtotal": 4.5,
        "total": 4.5,
        "pet_surcharge_rule": "pet_surcharge_v1",
    }
    parsed = PriceBreakdown.from_json_dict(legacy)
    assert parsed is not None
    assert parsed.category == "x"
    assert parsed.fare_subtotal == Decimal("4.50")
    assert parsed.price_per_km == TARIFF_GO.price_per_km
