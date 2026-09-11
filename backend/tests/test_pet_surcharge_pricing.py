"""PET-1 — Pet surcharge + price breakdown snapshot (A2.5-aware)."""

from __future__ import annotations

from decimal import Decimal

import uuid

from sqlalchemy.orm import Session

from app.core.pricing import (
    PET_SURCHARGE_EUR,
    PET_SURCHARGE_RULE_V1,
    calculate_commission_amount,
    calculate_fare_breakdown,
    calculate_pet_surcharge,
    money,
)
from app.core.tariffs import TARIFF_GO
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import Role, TripStatus, UserStatus
from app.services.pet_trip import pet_surcharge_for_trip, resolve_trip_pet_create


def test_pet_surcharge_rules() -> None:
    assert calculate_pet_surcharge(has_pet=False, is_assistance_animal=False) == Decimal(
        "0.00"
    )
    assert calculate_pet_surcharge(has_pet=True, is_assistance_animal=False) == Decimal(
        "1.50"
    )
    assert calculate_pet_surcharge(has_pet=True, is_assistance_animal=True) == Decimal(
        "0.00"
    )
    assert PET_SURCHARGE_EUR == Decimal("1.50")


def test_breakdown_go_without_pet() -> None:
    bd = calculate_fare_breakdown(0, 0, category="x", pet_surcharge=0)
    assert bd.pet_surcharge == Decimal("0.00")
    assert bd.total == money(TARIFF_GO.minimum_fare)
    assert bd.fare_subtotal == bd.total
    assert bd.tolls_amount == Decimal("0.00")
    assert bd.category == "x"


def test_breakdown_adds_pet_once() -> None:
    bd = calculate_fare_breakdown(
        10, 0, category="x", pet_surcharge=PET_SURCHARGE_EUR
    )
    fare = money(TARIFF_GO.base_fare + TARIFF_GO.price_per_km * Decimal("10"))
    assert bd.fare_subtotal == fare
    assert bd.pet_surcharge == Decimal("1.50")
    assert bd.total == money(fare + Decimal("1.50"))
    assert bd.pet_surcharge_rule == PET_SURCHARGE_RULE_V1


def test_breakdown_comfort_xl_same_surcharge() -> None:
    for _cat in ("comfort", "xl"):
        pet = resolve_trip_pet_create(vehicle_category=_cat, has_pet=True)
        assert pet.fare_category == _cat
        s = calculate_pet_surcharge(
            has_pet=pet.has_pet, is_assistance_animal=pet.is_assistance_animal
        )
        assert s == Decimal("1.50")


def test_assistance_zero_surcharge() -> None:
    pet = resolve_trip_pet_create(
        vehicle_category="x", has_pet=True, is_assistance_animal=True
    )
    assert pet.has_pet is False
    assert pet.is_assistance_animal is True
    assert (
        calculate_pet_surcharge(
            has_pet=pet.has_pet, is_assistance_animal=pet.is_assistance_animal
        )
        == Decimal("0.00")
    )


def test_legacy_pet_category_no_retroactive_surcharge(db: Session) -> None:
    uid = uuid.uuid4().hex[:8]
    pax = User(
        name=f"Pax_{uid}",
        phone=f"+351910{uid}",
        role=Role.passenger,
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="pet",
        has_pet=False,
        pet_surcharge_amount=None,
    )
    db.add(trip)
    db.flush()
    assert pet_surcharge_for_trip(trip) == Decimal("0.00")


def test_snapshot_used_for_idempotent_surcharge(db: Session) -> None:
    uid = uuid.uuid4().hex[:8]
    pax = User(
        name=f"Pax_{uid}",
        phone=f"+351911{uid}",
        role=Role.passenger,
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=6.5,
        vehicle_category="x",
        has_pet=True,
        pet_surcharge_amount=1.50,
        pet_surcharge_rule=PET_SURCHARGE_RULE_V1,
    )
    db.add(trip)
    db.flush()
    assert pet_surcharge_for_trip(trip) == Decimal("1.50")
    trip.has_pet = False
    assert pet_surcharge_for_trip(trip) == Decimal("1.50")


def test_commission_on_fare_and_pet_excludes_tolls() -> None:
    bd = calculate_fare_breakdown(
        0,
        0,
        category="x",
        pet_surcharge=PET_SURCHARGE_EUR,
        tolls_amount=Decimal("3.00"),
    )
    rate = Decimal("0.15")
    commission = calculate_commission_amount(
        bd.total, rate, tolls_amount=bd.tolls_amount
    )
    commissionable = money(bd.total - bd.tolls_amount)
    assert commissionable == money(TARIFF_GO.minimum_fare + Decimal("1.50"))
    assert commission == money(commissionable * rate)
    payout = money(bd.total - commission)
    assert commission + payout == bd.total
