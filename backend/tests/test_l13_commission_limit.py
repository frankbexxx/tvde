"""L-13 — reject configured commission percent outside 0–25% inclusive.

Does not clamp. Does not change the 15% formula, toll exclusion, or pet inclusion.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.core.pricing import (
    PET_SURCHARGE_EUR,
    CommissionPercentInvalid,
    calculate_commission_amount,
    calculate_fare_breakdown,
    commission_percent_decimal,
    money,
)
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services import trips as trip_service
from app.services.trips import (
    COMMISSION_PERCENT_OUT_OF_RANGE,
    cancel_trip_by_passenger,
)
from tests.support.unique_phone import unique_test_phone


def test_percent_bounds_and_invalid_values() -> None:
    allowed = (
        0,
        0.0,
        Decimal("0"),
        Decimal("10"),
        Decimal("12"),
        Decimal("15"),
        Decimal("20"),
        Decimal("25"),
        Decimal("25.00"),
        "25",
        "0",
    )
    for raw in allowed:
        got = commission_percent_decimal(raw)
        assert got.is_finite()
        assert Decimal("0") <= got <= Decimal("25")

    rejected = (
        Decimal("-0.01"),
        -1,
        "-0.01",
        Decimal("25.01"),
        25.01,
        "25.01",
        Decimal("26"),
        999,
        None,
        "",
        "abc",
        True,
        False,
        Decimal("NaN"),
        Decimal("Infinity"),
        Decimal("-Infinity"),
        float("nan"),
        float("inf"),
        float("-inf"),
    )
    for raw in rejected:
        with pytest.raises(CommissionPercentInvalid):
            commission_percent_decimal(raw)


def test_fifteen_percent_formula_excludes_tolls_includes_pet() -> None:
    bd = calculate_fare_breakdown(
        5,
        15,
        category="x",
        pet_surcharge=PET_SURCHARGE_EUR,
        tolls_amount=Decimal("2.00"),
    )
    commission = calculate_commission_amount(
        bd.total, Decimal("0.15"), tolls_amount=bd.tolls_amount
    )
    base = money(bd.total - bd.tolls_amount)
    assert base == money(bd.fare_subtotal + PET_SURCHARGE_EUR)
    assert bd.tolls_amount == Decimal("2.00")
    assert commission == money(base * Decimal("0.15"))
    assert commission != money(bd.total * Decimal("0.15"))


def test_minimum_fare_commission_unchanged() -> None:
    bd = calculate_fare_breakdown(
        0,
        0,
        category="x",
        pet_surcharge=PET_SURCHARGE_EUR,
        tolls_amount=Decimal("3.00"),
    )
    assert bd.fare_subtotal == bd.minimum_fare
    commission = calculate_commission_amount(
        bd.total, Decimal("0.15"), tolls_amount=bd.tolls_amount
    )
    assert commission == money((bd.minimum_fare + PET_SURCHARGE_EUR) * Decimal("0.15"))


def test_rounding_half_up_preserved_at_legal_boundary() -> None:
    total = Decimal("10.01")
    rate = Decimal("0.25")
    assert commission_percent_decimal(Decimal("25")) == Decimal("25")
    assert calculate_commission_amount(total, rate) == money(total * rate)
    # 25.00% is allowed even when the cent rounding is not a clean ratio.
    awkward = Decimal("0.03")
    assert calculate_commission_amount(awkward, rate) == money(awkward * rate)


def _user(db: Session, role: Role) -> User:
    user = User(
        role=role,
        name=f"{role.value} {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    return user


def _driver(db: Session, user: User, percent: float) -> Driver:
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=percent,
        is_available=True,
    )
    db.add(driver)
    db.flush()
    return driver


def _ongoing(
    db: Session,
    *,
    percent: float,
    distance_km: float = 3.0,
    duration_min: float = 10.0,
    has_pet: bool = False,
    tolls: Decimal | None = None,
) -> tuple[str, str, str]:
    passenger = _user(db, Role.passenger)
    driver_user = _user(db, Role.driver)
    _driver(db, driver_user, percent)
    breakdown = None
    if tolls is not None:
        breakdown = {
            "charged_tolls_amount": float(tolls),
            "tolls_amount": float(tolls),
        }
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.ongoing,
        origin_lat=38.6910,
        origin_lng=-9.3110,
        destination_lat=38.7742,
        destination_lng=-9.1342,
        estimated_price=10.0,
        distance_km=distance_km,
        duration_min=duration_min,
        has_pet=has_pet,
        price_breakdown=breakdown,
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        total_amount=0.50,
        commission_amount=0.08,
        driver_amount=0.42,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:24]}",
    )
    db.add(payment)
    db.commit()
    return str(driver_user.id), str(trip.id), str(payment.id)


def test_complete_fifteen_and_legacy_rates_settle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    for percent in (15.0, 10.0, 12.0, 20.0, 25.0):
        driver_id, trip_id, payment_id = _ongoing(db, percent=percent)
        completed = trip_service.complete_trip(
            db=db, driver_id=driver_id, trip_id=trip_id
        )
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        expected = calculate_commission_amount(
            completed.final_price, Decimal(str(percent)) / Decimal("100")
        )
        assert pay.status == PaymentStatus.succeeded
        assert Decimal(str(pay.commission_amount)) == expected
        assert completed.status == TripStatus.completed


def test_complete_with_tolls_and_pet_keeps_fifteen_percent_base(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id, payment_id = _ongoing(
        db,
        percent=15.0,
        distance_km=0.0,
        duration_min=0.0,
        has_pet=True,
        tolls=Decimal("2.00"),
    )
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
    breakdown = calculate_fare_breakdown(
        0,
        0,
        category="x",
        pet_surcharge=PET_SURCHARGE_EUR,
        tolls_amount=Decimal("2.00"),
    )
    expected = calculate_commission_amount(
        breakdown.total, Decimal("0.15"), tolls_amount=Decimal("2.00")
    )
    assert Decimal(str(completed.final_price)) == breakdown.total
    assert Decimal(str(pay.commission_amount)) == expected
    assert expected == money((breakdown.minimum_fare + PET_SURCHARGE_EUR) * Decimal("0.15"))


def test_complete_rejects_before_capture(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)

    def _boom(*_a, **_k):
        raise AssertionError("stripe must not be called")

    monkeypatch.setattr(trip_service, "retrieve_payment_intent", _boom)
    monkeypatch.setattr(trip_service, "update_payment_intent_amount", _boom)
    monkeypatch.setattr(trip_service, "confirm_payment_intent", _boom)
    monkeypatch.setattr(trip_service, "capture_payment_intent", _boom)

    for percent in (25.01, -1.0):
        driver_id, trip_id, payment_id = _ongoing(db, percent=percent)
        with pytest.raises(HTTPException) as exc:
            trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
        assert exc.value.status_code == 422
        assert exc.value.detail == COMMISSION_PERCENT_OUT_OF_RANGE
        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
        assert trip.status == TripStatus.ongoing
        assert trip.final_price is None
        assert pay.status == PaymentStatus.processing
        assert float(pay.total_amount) == 0.50
        assert float(pay.commission_amount) == 0.08
        assert pay.driver_payout is None


def test_accept_rejects_invalid_percent_without_payment(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    def _boom(**_k):
        raise AssertionError("stripe must not be called")

    monkeypatch.setattr(trip_service, "create_authorization_payment_intent", _boom)
    passenger = _user(db, Role.passenger)
    driver_user = _user(db, Role.driver)
    _driver(db, driver_user, 25.01)
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.assigned,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    trip_id = str(trip.id)
    with pytest.raises(HTTPException) as exc:
        trip_service.accept_trip(db=db, driver_id=str(driver_user.id), trip_id=trip_id)
    assert exc.value.status_code == 422
    assert exc.value.detail == COMMISSION_PERCENT_OUT_OF_RANGE
    stored = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    assert stored.status == TripStatus.assigned
    assert stored.driver_id is None
    pay = db.execute(select(Payment).where(Payment.trip_id == stored.id)).scalar_one_or_none()
    assert pay is None


def test_cancel_still_records_fixed_fee(db: Session) -> None:
    passenger = _user(db, Role.passenger)
    driver_user = _user(db, Role.driver)
    _driver(db, driver_user, 15.0)
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    result = cancel_trip_by_passenger(
        db=db,
        passenger_id=str(passenger.id),
        trip_id=str(trip.id),
        reason="changed_plans",
    )
    db.refresh(result)
    assert result.status == TripStatus.cancelled
    assert result.cancellation_fee == 3.0
    assert result.cancelled_by == "passenger"
