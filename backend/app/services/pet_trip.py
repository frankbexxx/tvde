"""PET-0 — fare category vs Pet attributes (domain helpers).

``trip.vehicle_category`` remains the **fare / matching category**
(``x`` = GO, ``comfort``, ``xl``, …). Pet is an additive attribute
(``has_pet`` / assistance), not a primary fare category.

Legacy rows may still store ``vehicle_category='pet'``; helpers treat those
as fare ``x`` + Pet required for matching, without rewriting history.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status

from app.core.pricing import calculate_pet_surcharge, money
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.services.driver_preferences import (
    VALID_DRIVER_CATEGORIES,
    decode_driver_categories_csv,
    normalize_driver_categories,
)

# Re-export for callers / tests that import surcharge constants from this module.
from app.core.pricing import PET_SURCHARGE_EUR, PET_SURCHARGE_RULE_V1  # noqa: F401

# Fare / matching categories (Pet is NOT a fare category going forward).
FARE_CATEGORIES = frozenset(
    {"x", "xl", "comfort", "black", "electric", "van"}
)
LEGACY_PET_CATEGORY = "pet"

# Pet surcharge (PET-1) — applied in pricing; matching still uses attributes only.
PET_SIZES = frozenset({"small", "medium", "large"})
PET_TRANSPORTS = frozenset({"carrier", "harness"})


def pet_surcharge_for_trip(trip: Trip | Any) -> Decimal:
    """Resolve Pet surcharge for estimate/complete without double-counting.

    - If ``pet_surcharge_amount`` is snapshotted (incl. 0.00) → use snapshot.
    - Else (legacy pre-PET-1 rows): **no** retroactive surcharge, even if
      ``vehicle_category='pet'``.
    - Assistance → 0; ``has_pet`` → €1.50.
    """
    snap = getattr(trip, "pet_surcharge_amount", None)
    if snap is not None:
        return money(Decimal(str(snap)))

    return calculate_pet_surcharge(
        has_pet=bool(getattr(trip, "has_pet", False)),
        is_assistance_animal=bool(getattr(trip, "is_assistance_animal", False)),
    )


@dataclass(frozen=True)
class ResolvedTripPetCreate:
    """Normalized create payload for Trip pet + fare fields."""

    fare_category: str
    has_pet: bool
    pet_size: str | None
    pet_transport: str | None
    is_assistance_animal: bool
    pet_occupies_seat: bool


def trip_stored_category(trip: Trip | Any) -> str:
    raw = getattr(trip, "vehicle_category", None)
    return (raw or "x").strip().lower()


def trip_fare_category(trip: Trip | Any) -> str:
    """Effective fare category for matching / future pricing."""
    stored = trip_stored_category(trip)
    if stored == LEGACY_PET_CATEGORY:
        return "x"
    if stored in FARE_CATEGORIES:
        return stored
    # Unknown / empty → default GO
    return "x"


def trip_is_legacy_pet_category(trip: Trip | Any) -> bool:
    return trip_stored_category(trip) == LEGACY_PET_CATEGORY


def trip_has_pet_request(trip: Trip | Any) -> bool:
    """True when this trip carries a normal Pet (not assistance)."""
    if bool(getattr(trip, "is_assistance_animal", False)):
        return False
    if bool(getattr(trip, "has_pet", False)):
        return True
    return trip_is_legacy_pet_category(trip)


def trip_requires_pet_driver_opt_in(trip: Trip | Any) -> bool:
    """Normal Pet requires Driver ``pet`` preference; assistance does not."""
    if bool(getattr(trip, "is_assistance_animal", False)):
        return False
    return trip_has_pet_request(trip)


def driver_accepts_pet(driver: Driver | Any) -> bool:
    cats = decode_driver_categories_csv(getattr(driver, "vehicle_categories", None))
    return LEGACY_PET_CATEGORY in cats


def driver_matches_trip_fare_and_pet(driver: Driver | Any, trip: Trip | Any) -> bool:
    """Combined matching: fare category + optional Pet opt-in.

    Legacy ``vehicle_category='pet'`` (has_pet still false): keep old behaviour —
    Driver must have ``pet`` in preferences (fare check skipped for that legacy
    exclusive category). New trips use fare category + ``has_pet``.
    """
    cats = decode_driver_categories_csv(getattr(driver, "vehicle_categories", None))

    if bool(getattr(trip, "is_assistance_animal", False)):
        return trip_fare_category(trip) in cats

    if trip_is_legacy_pet_category(trip) and not bool(getattr(trip, "has_pet", False)):
        return LEGACY_PET_CATEGORY in cats

    fare = trip_fare_category(trip)
    if fare not in cats:
        return False
    if trip_requires_pet_driver_opt_in(trip):
        return LEGACY_PET_CATEGORY in cats
    return True


def _norm_optional_token(value: str | None, *, allowed: frozenset[str], field: str) -> str | None:
    if value is None:
        return None
    v = str(value).strip().lower()
    if not v:
        return None
    if v not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"invalid_{field}",
        )
    return v


def resolve_trip_pet_create(
    *,
    vehicle_category: str | None,
    has_pet: bool = False,
    pet_size: str | None = None,
    pet_transport: str | None = None,
    is_assistance_animal: bool = False,
    pet_occupies_seat: bool = False,
) -> ResolvedTripPetCreate:
    """Normalize create input; never persist ``vehicle_category='pet'`` on new trips."""
    raw_cat = (vehicle_category or "x").strip().lower()
    if raw_cat == "standard":
        raw_cat = "x"

    legacy_pet_request = raw_cat == LEGACY_PET_CATEGORY
    if legacy_pet_request:
        fare_category = "x"
        has_pet = True
    else:
        normalized = normalize_driver_categories([raw_cat or "x"])
        fare_category = normalized[0] if normalized else "x"
        if fare_category == LEGACY_PET_CATEGORY:
            # normalize_driver_categories still allows "pet" in VALID set
            fare_category = "x"
            has_pet = True
        elif fare_category not in FARE_CATEGORIES and fare_category in VALID_DRIVER_CATEGORIES:
            # black/electric/van still valid matching keys
            pass
        elif fare_category not in FARE_CATEGORIES:
            fare_category = "x"

    size = _norm_optional_token(pet_size, allowed=PET_SIZES, field="pet_size")
    transport = _norm_optional_token(
        pet_transport, allowed=PET_TRANSPORTS, field="pet_transport"
    )

    if is_assistance_animal:
        # Assistance is separate from paid Pet; seat occupancy still counts for capacity.
        return ResolvedTripPetCreate(
            fare_category=fare_category if fare_category != LEGACY_PET_CATEGORY else "x",
            has_pet=False,
            pet_size=None,
            pet_transport=None,
            is_assistance_animal=True,
            pet_occupies_seat=bool(pet_occupies_seat),
        )

    if not has_pet:
        if size is not None or transport is not None or pet_occupies_seat:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="pet_attributes_require_has_pet",
            )
        return ResolvedTripPetCreate(
            fare_category=fare_category,
            has_pet=False,
            pet_size=None,
            pet_transport=None,
            is_assistance_animal=False,
            pet_occupies_seat=False,
        )

    # Normal Pet — size/transport optional in PET-0 (Passenger UX in PET-2),
    # but when both large + transport are present, enforce harness rule early.
    if size == "large" and transport is not None and transport != "harness":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="pet_large_requires_harness",
        )

    return ResolvedTripPetCreate(
        fare_category=fare_category,
        has_pet=True,
        pet_size=size,
        pet_transport=transport,
        is_assistance_animal=False,
        pet_occupies_seat=bool(pet_occupies_seat),
    )
