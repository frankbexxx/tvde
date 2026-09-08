"""G-KYC-P0-03: inactive vehicle blocks new ops; active trips survive."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.session import engine
from app.models.enums import (
    DriverStatus,
    OfferStatus,
    PaymentStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services import offer_dispatch, partner_vehicles, trips
from app.services.vehicle_operational import (
    CODE_VEHICLE_INACTIVE,
    assert_driver_vehicle_operational_for_new_ops,
    driver_vehicle_allows_new_ops,
)


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_driver_with_vehicle(
    db: Session,
    *,
    vehicle_status: str = "active",
    with_location: bool = True,
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    pid = uuid.uuid4()
    db.add(Partner(id=pid, name=f"Inactive Veh Fleet {pid}"))
    u = User(
        role=Role.driver,
        name="Inactive Veh Driver",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    pax = User(
        role=Role.passenger,
        name="Inactive Veh Pax",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add_all([u, pax])
    db.flush()
    v = Vehicle(
        partner_id=pid,
        plate=f"IN-{uuid.uuid4().hex[:6].upper()}",
        plate_normalized=f"IN{uuid.uuid4().hex[:10].upper()}",
        make="Test",
        model="Car",
        status=vehicle_status,
    )
    db.add(v)
    db.flush()
    db.add(
        Driver(
            user_id=u.id,
            partner_id=pid,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
            vehicle_categories="x",
            active_vehicle_id=v.id,
        )
    )
    if with_location:
        db.add(
            DriverLocation(
                driver_id=u.id,
                lat=38.7223,
                lng=-9.1393,
                timestamp=datetime.now(timezone.utc),
            )
        )
    db.commit()
    return u.id, v.id, pax.id


def _make_trip(
    *,
    passenger_id: uuid.UUID,
    status: TripStatus = TripStatus.requested,
    driver_id: uuid.UUID | None = None,
) -> Trip:
    return Trip(
        passenger_id=passenger_id,
        driver_id=driver_id,
        status=status,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        estimated_price=5.0,
        vehicle_category="x",
    )


def test_matching_excludes_inactive_vehicle(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    monkeypatch.setattr(settings, "OFFER_TOP_N", 5, raising=False)
    monkeypatch.setattr(settings, "GEO_RADIUS_KM", 50.0, raising=False)
    driver_id, _vid, pax_id = _seed_driver_with_vehicle(db, vehicle_status="inactive")
    trip = _make_trip(passenger_id=pax_id)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    offers = offer_dispatch.create_offers_for_trip(db=db, trip=trip)
    assert all(o.driver_id != driver_id for o in offers)
    assert (
        db.execute(
            select(TripOffer).where(
                TripOffer.trip_id == trip.id, TripOffer.driver_id == driver_id
            )
        ).scalar_one_or_none()
        is None
    )


def test_matching_includes_active_vehicle(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    monkeypatch.setattr(settings, "OFFER_TOP_N", 5, raising=False)
    monkeypatch.setattr(settings, "GEO_RADIUS_KM", 50.0, raising=False)
    driver_id, _vid, pax_id = _seed_driver_with_vehicle(db, vehicle_status="active")
    trip = _make_trip(passenger_id=pax_id)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    offers = offer_dispatch.create_offers_for_trip(db=db, trip=trip)
    assert len(offers) >= 1
    assert any(o.driver_id == driver_id for o in offers)


def test_case_a_offer_then_inactive_blocks_accept(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    driver_id, vid, pax_id = _seed_driver_with_vehicle(db, vehicle_status="active")
    trip = _make_trip(passenger_id=pax_id)
    db.add(trip)
    db.flush()
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=driver_id,
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(offer)
    db.commit()

    vehicle = db.get(Vehicle, vid)
    assert vehicle is not None
    vehicle.status = "inactive"
    db.commit()

    with pytest.raises(HTTPException) as ei:
        trips.accept_offer(db=db, driver_id=str(driver_id), offer_id=str(offer.id))
    assert ei.value.status_code == 409
    assert ei.value.detail == CODE_VEHICLE_INACTIVE
    db.refresh(trip)
    assert trip.status == TripStatus.requested
    assert trip.driver_id is None
    assert (
        db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one_or_none()
        is None
    )


def test_case_b_active_trip_survives_inactive(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id, vid, pax_id = _seed_driver_with_vehicle(db, vehicle_status="active")
    trip = _make_trip(
        passenger_id=pax_id, status=TripStatus.accepted, driver_id=driver_id
    )
    db.add(trip)
    db.flush()
    db.add(
        Payment(
            trip_id=trip.id,
            total_amount=0.5,
            commission_amount=0.05,
            driver_amount=0.45,
            currency="EUR",
            status=PaymentStatus.processing,
            stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:16]}",
        )
    )
    db.commit()
    trip_id = trip.id

    vehicle = db.get(Vehicle, vid)
    assert vehicle is not None
    vehicle.status = "inactive"
    db.commit()

    db.refresh(trip)
    assert trip.status == TripStatus.accepted
    assert trip.driver_id == driver_id
    still = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
    assert still.status == TripStatus.accepted


def test_case_d_reactivation_restores_eligibility(db: Session) -> None:
    driver_id, vid, _pax = _seed_driver_with_vehicle(db, vehicle_status="inactive")
    driver = db.get(Driver, driver_id)
    assert driver is not None
    assert driver_vehicle_allows_new_ops(db, driver) is False
    with pytest.raises(HTTPException) as ei:
        assert_driver_vehicle_operational_for_new_ops(
            db, driver, surface="test"
        )
    assert ei.value.detail == CODE_VEHICLE_INACTIVE

    vehicle = db.get(Vehicle, vid)
    assert vehicle is not None
    vehicle.status = "active"
    db.commit()
    db.refresh(driver)
    assert driver_vehicle_allows_new_ops(db, driver) is True


def test_no_vehicle_still_allowed(db: Session) -> None:
    """Preserve current policy: no active_vehicle_id is not blocked by this gate."""
    pid = uuid.uuid4()
    db.add(Partner(id=pid, name="No Veh"))
    u = User(
        role=Role.driver,
        name="No Veh Driver",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    db.add(
        Driver(
            user_id=u.id,
            partner_id=pid,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
            active_vehicle_id=None,
        )
    )
    db.commit()
    driver = db.get(Driver, u.id)
    assert driver is not None
    assert driver_vehicle_allows_new_ops(db, driver) is True


def test_partner_patch_inactive_keeps_assignment(db: Session) -> None:
    driver_id, vid, _ = _seed_driver_with_vehicle(db, vehicle_status="active")
    driver = db.get(Driver, driver_id)
    assert driver is not None
    partner_id = str(driver.partner_id)
    from app.schemas.partner import PartnerVehiclePatchRequest

    partner_vehicles.patch_vehicle_for_partner(
        db,
        partner_id=partner_id,
        vehicle_id=vid,
        body=PartnerVehiclePatchRequest(status="inactive"),
    )
    db.refresh(driver)
    assert driver.active_vehicle_id == vid
    assert driver_vehicle_allows_new_ops(db, driver) is False
