"""L-15 — freeze the commercial intermediation rate on the trip.

New trips persist 15% and settlement uses that snapshot.
Legacy rows with NULL keep driver.commission_percent.
"""

from __future__ import annotations

import asyncio
import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.serializers.trip import (
    intermediation_rate_percent_api,
    trip_to_detail,
    trip_to_history_item,
    trip_to_status_response,
)
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.core.pricing import (
    PET_SURCHARGE_EUR,
    TRIP_INTERMEDIATION_RATE_PERCENT,
    calculate_commission_amount,
    calculate_fare_breakdown,
    effective_intermediation_percent,
    money,
)
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services import trips as trip_service
from app.services.trips import COMMISSION_PERCENT_OUT_OF_RANGE, create_trip
from tests.support.unique_phone import unique_test_phone

ORIGIN = (38.6910, -9.3110)
DEST = (38.7742, -9.1342)


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
    snapshot: Decimal | None,
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
        origin_lat=ORIGIN[0],
        origin_lng=ORIGIN[1],
        destination_lat=DEST[0],
        destination_lng=DEST[1],
        estimated_price=10.0,
        distance_km=distance_km,
        duration_min=duration_min,
        has_pet=has_pet,
        price_breakdown=breakdown,
        intermediation_rate_percent=snapshot,
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


def _block_stripe(monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom(*_a, **_k):
        raise AssertionError("stripe must not be called")

    monkeypatch.setattr(trip_service, "retrieve_payment_intent", _boom)
    monkeypatch.setattr(trip_service, "update_payment_intent_amount", _boom)
    monkeypatch.setattr(trip_service, "confirm_payment_intent", _boom)
    monkeypatch.setattr(trip_service, "capture_payment_intent", _boom)
    monkeypatch.setattr(trip_service, "create_authorization_payment_intent", _boom)


def test_commercial_constant_is_fifteen() -> None:
    assert TRIP_INTERMEDIATION_RATE_PERCENT == Decimal("15")
    assert effective_intermediation_percent(Decimal("15"), Decimal("20")) == Decimal("15")
    assert effective_intermediation_percent(None, Decimal("12")) == Decimal("12")


def test_create_persists_fifteen_percent(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(
        "app.services.osrm.get_route_distance_duration",
        lambda *a, **k: (10.0, 15.0),
        raising=False,
    )
    monkeypatch.setattr(trip_service, "create_offers_for_trip", lambda **k: [object()])
    monkeypatch.setattr(trip_service, "publish_trip_offers", lambda **k: None)
    passenger = _user(db, Role.passenger)
    db.commit()
    trip, _eta = asyncio.run(
        create_trip(
            db=db,
            passenger_id=str(passenger.id),
            payload=TripCreateRequest(
                origin_lat=ORIGIN[0],
                origin_lng=ORIGIN[1],
                destination_lat=DEST[0],
                destination_lng=DEST[1],
            ),
        )
    )
    db.refresh(trip)
    assert trip.intermediation_rate_percent == Decimal("15.00")
    assert intermediation_rate_percent_api(trip) == 15.0
    detail = trip_to_detail(trip)
    assert detail.intermediation_rate_percent == 15.0


@pytest.mark.parametrize("driver_percent", [10.0, 12.0, 20.0])
def test_complete_snapshot_overrides_driver_percent(
    db: Session, monkeypatch: pytest.MonkeyPatch, driver_percent: float
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id, payment_id = _ongoing(
        db, percent=driver_percent, snapshot=Decimal("15")
    )
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
    expected = calculate_commission_amount(
        completed.final_price, TRIP_INTERMEDIATION_RATE_PERCENT / Decimal("100")
    )
    assert Decimal(str(pay.commission_amount)) == expected
    assert trip_to_status_response(completed).intermediation_rate_percent == 15.0


def test_complete_legacy_null_uses_driver_percent(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id, payment_id = _ongoing(db, percent=12.0, snapshot=None)
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
    expected = calculate_commission_amount(completed.final_price, Decimal("0.12"))
    assert Decimal(str(pay.commission_amount)) == expected
    assert intermediation_rate_percent_api(completed) is None
    assert trip_to_history_item(completed).intermediation_rate_percent is None


def test_complete_legacy_null_rejects_invalid_driver(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    _block_stripe(monkeypatch)
    driver_id, trip_id, payment_id = _ongoing(db, percent=25.01, snapshot=None)
    with pytest.raises(HTTPException) as exc:
        trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    assert exc.value.status_code == 422
    assert exc.value.detail == COMMISSION_PERCENT_OUT_OF_RANGE
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
    assert trip.status == TripStatus.ongoing
    assert pay.status == PaymentStatus.processing
    assert pay.driver_payout is None


@pytest.mark.parametrize("snapshot", [Decimal("25.01"), Decimal("-1")])
def test_complete_rejects_invalid_snapshot_before_capture(
    db: Session, monkeypatch: pytest.MonkeyPatch, snapshot: Decimal
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    _block_stripe(monkeypatch)
    driver_id, trip_id, payment_id = _ongoing(db, percent=15.0, snapshot=snapshot)
    with pytest.raises(HTTPException) as exc:
        trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    assert exc.value.status_code == 422
    assert exc.value.detail == COMMISSION_PERCENT_OUT_OF_RANGE
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    pay = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one()
    assert trip.status == TripStatus.ongoing
    assert trip.final_price is None
    assert float(pay.total_amount) == 0.50
    assert pay.driver_payout is None


def test_complete_snapshot_excludes_tolls_includes_pet_and_minimum(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, trip_id, payment_id = _ongoing(
        db,
        percent=20.0,
        snapshot=Decimal("15"),
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


def test_accept_placeholder_uses_snapshot_not_driver_percent(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    for name in (
        "assert_driver_can_accept_by_driving_hours",
        "assert_driver_vehicle_operational_for_new_ops",
        "assert_driver_vehicle_compliance_for_accept",
        "_assert_driver_matches_trip_for_accept",
    ):
        monkeypatch.setattr(trip_service, name, lambda *a, **k: None)
    passenger = _user(db, Role.passenger)
    driver_user = _user(db, Role.driver)
    _driver(db, driver_user, 20.0)
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.assigned,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        intermediation_rate_percent=Decimal("15"),
    )
    db.add(trip)
    db.commit()
    accepted, _secret = trip_service.accept_trip(
        db=db, driver_id=str(driver_user.id), trip_id=str(trip.id)
    )
    pay = db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one()
    assert accepted.status == TripStatus.accepted
    assert Decimal(str(pay.commission_amount)) == money(Decimal("0.50") * Decimal("0.15"))
    assert Decimal(str(pay.commission_amount)) != money(Decimal("0.50") * Decimal("0.20"))


def test_accept_invalid_snapshot_creates_no_payment(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    _block_stripe(monkeypatch)
    passenger = _user(db, Role.passenger)
    driver_user = _user(db, Role.driver)
    _driver(db, driver_user, 15.0)
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.assigned,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        intermediation_rate_percent=Decimal("26"),
    )
    db.add(trip)
    db.commit()
    with pytest.raises(HTTPException) as exc:
        trip_service.accept_trip(
            db=db, driver_id=str(driver_user.id), trip_id=str(trip.id)
        )
    assert exc.value.status_code == 422
    stored = db.execute(select(Trip).where(Trip.id == trip.id)).scalar_one()
    assert stored.status == TripStatus.assigned
    assert stored.driver_id is None
    assert db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one_or_none() is None
