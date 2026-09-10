"""PET-5B — Partner/Admin pet reporting fields."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.api.routers.partner import _trip_item
from app.api.serializers.trip import trip_to_detail, trip_to_history_item
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.pet_reporting import offer_rejection_rows


def _seed(db: Session) -> tuple[Trip, Driver]:
    pax = User(
        role=Role.passenger,
        name="PaxRep",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    du = User(
        role=Role.driver,
        name="DrvRep",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(du)
    db.flush()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"REP-{uuid.uuid4().hex[:6].upper()}",
        plate_normalized=f"REP{uuid.uuid4().hex[:6].upper()}",
        make="Test",
        model="Pet",
        status="active",
    )
    db.add(vehicle)
    db.flush()
    drv = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=du.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        active_vehicle_id=vehicle.id,
    )
    db.add(drv)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        driver_id=du.id,
        partner_id=DEFAULT_PARTNER_UUID,
        vehicle_id=vehicle.id,
        status=TripStatus.cancelled,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=10.0,
        final_price=11.5,
        vehicle_category="x",
        has_pet=True,
        pet_size="small",
        pet_transport="carrier",
        pet_occupies_seat=False,
        passenger_count=2,
        pet_surcharge_amount=1.5,
        price_breakdown={
            "base_fare": 5.0,
            "distance_amount": 3.0,
            "duration_amount": 2.0,
            "minimum_fare_adjustment": 0.0,
            "pet_surcharge": 1.5,
            "tolls_amount": 0.0,
            "fare_subtotal": 10.0,
            "total": 11.5,
            "pet_surcharge_rule": "pet_surcharge_v1",
        },
        cancellation_reason_code="animal_hygiene_issue",
        cancellation_reason=None,
        cancelled_by="driver",
    )
    db.add(trip)
    db.flush()
    db.add(
        TripOffer(
            trip_id=trip.id,
            driver_id=du.id,
            status=OfferStatus.rejected,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
            rejection_reason_code="inadequate_accommodation",
            rejection_reason_detail=None,
        )
    )
    db.commit()
    db.refresh(trip)
    return trip, drv


def test_partner_trip_item_includes_pet_reporting(db: Session) -> None:
    trip, _ = _seed(db)
    # Reload with vehicle relationship
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select

    trip = db.execute(
        select(Trip).options(joinedload(Trip.vehicle)).where(Trip.id == trip.id)
    ).unique().scalar_one()
    item = _trip_item(trip, offer_rejections=offer_rejection_rows(db, trip.id))
    assert item.passenger_count == 2
    assert item.has_pet is True
    assert item.pet_size == "small"
    assert item.pet_surcharge == 1.5
    assert item.vehicle_plate is not None
    assert item.price_breakdown is not None
    assert item.price_breakdown["pet_surcharge"] == 1.5
    assert item.cancel_reason_code == "animal_hygiene_issue"
    assert len(item.offer_rejections) == 1
    assert item.offer_rejections[0].reason_code == "inadequate_accommodation"


def test_admin_history_and_detail_pet_fields(db: Session) -> None:
    trip, _ = _seed(db)
    hist = trip_to_history_item(trip, include_stripe_pi=True)
    assert hist.has_pet is True
    assert hist.passenger_count == 2
    assert hist.pet_surcharge == 1.5
    assert hist.cancelled_by == "driver"

    from sqlalchemy.orm import joinedload
    from sqlalchemy import select

    trip = db.execute(
        select(Trip).options(joinedload(Trip.vehicle), joinedload(Trip.payment)).where(Trip.id == trip.id)
    ).unique().scalar_one()
    detail = trip_to_detail(
        trip,
        include_stripe_pi=True,
        include_cancellation_detail=True,
        include_vehicle_plate=True,
        offer_rejections=offer_rejection_rows(db, trip.id),
    )
    assert detail.vehicle_plate is not None
    assert detail.price_breakdown is not None
    assert detail.price_breakdown.pet_surcharge == 1.5
    assert len(detail.offer_rejections) == 1


def test_assistance_trip_no_commercial_surcharge_in_history(db: Session) -> None:
    pax = User(
        role=Role.passenger,
        name="PaxA",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.completed,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=8.0,
        is_assistance_animal=True,
        has_pet=False,
        passenger_count=1,
        pet_surcharge_amount=0.0,
    )
    db.add(trip)
    db.commit()
    hist = trip_to_history_item(trip)
    assert hist.is_assistance_animal is True
    assert hist.has_pet is False
    assert hist.pet_surcharge == 0.0
