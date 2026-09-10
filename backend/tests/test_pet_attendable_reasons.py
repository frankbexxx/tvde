"""PET-5A.2 — structured attendable reasons for pet/assistance reject & cancel."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.serializers.trip import trip_to_detail, trip_to_history_item
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.attendable_reasons import (
    passenger_safe_label,
    trip_involves_animal,
    validate_attendable_reason,
)
from app.services.trips import cancel_trip_by_driver, reject_offer


def _passenger(db: Session) -> User:
    u = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    return u


def _driver(db: Session) -> Driver:
    u = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        vehicle_categories="x",
    )
    db.add(d)
    db.flush()
    return d


def _offer_for_trip(db: Session, trip: Trip, driver: Driver) -> TripOffer:
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=driver.user_id,
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(offer)
    db.flush()
    return offer


def test_validate_other_requires_detail() -> None:
    with pytest.raises(HTTPException) as ei:
        validate_attendable_reason(
            reason_code="other_attendable_reason",
            reason_detail="  ",
            required=True,
        )
    assert ei.value.detail == "attendable_reason_detail_required"


def test_validate_invalid_code() -> None:
    with pytest.raises(HTTPException) as ei:
        validate_attendable_reason(
            reason_code="dont_like_animals",
            reason_detail=None,
            required=True,
        )
    assert ei.value.detail == "attendable_reason_code_invalid"


def test_reject_pet_without_reason_blocked(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="x",
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    offer = _offer_for_trip(db, trip, drv)
    db.commit()
    with pytest.raises(HTTPException) as ei:
        reject_offer(db=db, driver_id=str(drv.user_id), offer_id=str(offer.id))
    assert ei.value.detail == "attendable_reason_code_required"


def test_reject_pet_with_code_persisted(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="x",
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    offer = _offer_for_trip(db, trip, drv)
    db.commit()
    out = reject_offer(
        db=db,
        driver_id=str(drv.user_id),
        offer_id=str(offer.id),
        reason_code="animal_hygiene_issue",
    )
    assert out.status == OfferStatus.rejected
    assert out.rejection_reason_code == "animal_hygiene_issue"
    assert out.rejection_reason_detail is None


def test_reject_other_requires_detail(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    offer = _offer_for_trip(db, trip, drv)
    db.commit()
    with pytest.raises(HTTPException) as ei:
        reject_offer(
            db=db,
            driver_id=str(drv.user_id),
            offer_id=str(offer.id),
            reason_code="other_attendable_reason",
        )
    assert ei.value.detail == "attendable_reason_detail_required"

    out = reject_offer(
        db=db,
        driver_id=str(drv.user_id),
        offer_id=str(offer.id),
        reason_code="other_attendable_reason",
        reason_detail="comportamento agressivo no local",
    )
    assert out.rejection_reason_code == "other_attendable_reason"
    assert out.rejection_reason_detail == "comportamento agressivo no local"


def test_reject_assistance_requires_reason(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        is_assistance_animal=True,
    )
    db.add(trip)
    db.flush()
    offer = _offer_for_trip(db, trip, drv)
    db.commit()
    with pytest.raises(HTTPException):
        reject_offer(db=db, driver_id=str(drv.user_id), offer_id=str(offer.id))
    out = reject_offer(
        db=db,
        driver_id=str(drv.user_id),
        offer_id=str(offer.id),
        reason_code="animal_safety_risk",
    )
    assert out.rejection_reason_code == "animal_safety_risk"
    assert trip_involves_animal(trip) is True


def test_reject_normal_trip_without_body(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        has_pet=False,
    )
    db.add(trip)
    db.flush()
    offer = _offer_for_trip(db, trip, drv)
    db.commit()
    out = reject_offer(db=db, driver_id=str(drv.user_id), offer_id=str(offer.id))
    assert out.status == OfferStatus.rejected
    assert out.rejection_reason_code is None


def test_cancel_pet_structured(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        driver_id=drv.user_id,
        status=TripStatus.accepted,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        has_pet=True,
    )
    db.add(trip)
    db.commit()
    with pytest.raises(HTTPException):
        cancel_trip_by_driver(db=db, driver_id=str(drv.user_id), trip_id=str(trip.id))

    result = cancel_trip_by_driver(
        db=db,
        driver_id=str(drv.user_id),
        trip_id=str(trip.id),
        reason_code="inadequate_accommodation",
    )
    assert result.status == TripStatus.cancelled
    assert result.cancellation_reason_code == "inadequate_accommodation"
    assert result.cancelled_by == "driver"


def test_cancel_assistance_other_with_detail(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        driver_id=drv.user_id,
        status=TripStatus.arriving,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        is_assistance_animal=True,
    )
    db.add(trip)
    db.commit()
    result = cancel_trip_by_driver(
        db=db,
        driver_id=str(drv.user_id),
        trip_id=str(trip.id),
        reason_code="other_attendable_reason",
        reason_detail="animal fora de controlo no local",
    )
    assert result.cancellation_reason_code == "other_attendable_reason"
    assert result.cancellation_reason == "animal fora de controlo no local"

    hist = trip_to_history_item(result)
    assert hist.cancellation_reason_code == "other_attendable_reason"
    assert hist.cancellation_reason == passenger_safe_label("other_attendable_reason")
    assert "fora de controlo" not in (hist.cancellation_reason or "")

    detail_pax = trip_to_detail(result, include_cancellation_detail=False)
    assert detail_pax.cancellation_reason_detail is None
    assert detail_pax.cancellation_reason == passenger_safe_label("other_attendable_reason")

    detail_ops = trip_to_detail(result, include_cancellation_detail=True)
    assert detail_ops.cancellation_reason_detail == "animal fora de controlo no local"
    assert detail_ops.is_assistance_animal is True


def test_cancel_normal_legacy_reason(db: Session) -> None:
    pax = _passenger(db)
    drv = _driver(db)
    trip = Trip(
        passenger_id=pax.id,
        driver_id=drv.user_id,
        status=TripStatus.accepted,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
    )
    db.add(trip)
    db.commit()
    result = cancel_trip_by_driver(
        db=db,
        driver_id=str(drv.user_id),
        trip_id=str(trip.id),
        reason="Imprevisto",
    )
    assert result.cancellation_reason == "Imprevisto"
    assert result.cancellation_reason_code is None
