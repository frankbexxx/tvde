"""list_available_trips must match accept vehicle eligibility (G-KYC-P0-04)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.trips import accept_offer, list_available_trips
from app.services.vehicle_compliance_gate import (
    CODE_DOCUMENTS_BLOCKED,
    CODE_NO_ACTIVE_VEHICLE,
    driver_eligible_for_new_trip_ops,
    evaluate_driver_new_trip_ops_eligibility,
)
from app.services.vehicle_operational import CODE_VEHICLE_INACTIVE


def _create_vehicle_with_docs(
    db: Session,
    *,
    doc_mode: str = "compliant",
    vehicle_status: str = "active",
) -> uuid.UUID:
    plate_suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"LAV-{plate_suffix}",
        plate_normalized=f"LAV{plate_suffix}",
        make="Test",
        model="List",
        status=vehicle_status,
    )
    db.add(vehicle)
    db.flush()
    now = datetime.now(timezone.utc)
    if doc_mode != "none":
        for i, doc_type in enumerate(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED):
            status = "approved"
            expires_at = now + timedelta(days=365)
            if doc_mode == "blocked_expired" and i == 0:
                expires_at = now - timedelta(days=1)
            elif doc_mode == "blocked_rejected" and i == 0:
                status = "rejected"
            elif doc_mode == "warning_pending" and i == 0:
                status = "pending_review"
            elif doc_mode == "warning_expiring" and i == 0:
                expires_at = now + timedelta(days=10)
            db.add(
                VehicleDocument(
                    vehicle_id=vehicle.id,
                    partner_id=DEFAULT_PARTNER_UUID,
                    document_type=doc_type,
                    status=status,
                    expires_at=expires_at,
                )
            )
    db.commit()
    return vehicle.id


def _create_driver(
    db: Session,
    *,
    active_vehicle_id: uuid.UUID | None = None,
    is_available: bool = True,
) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"ListAvail {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=is_available,
            vehicle_categories="x",
            active_vehicle_id=active_vehicle_id,
        )
    )
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=38.7223,
            lng=-9.1393,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return user.id


def _seed_offer_for_driver(db: Session, driver_id: uuid.UUID) -> uuid.UUID:
    pax = User(
        role=Role.passenger,
        name="ListAvail Pax",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        estimated_price=5.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.flush()
    db.add(
        TripOffer(
            trip_id=trip.id,
            driver_id=driver_id,
            status=OfferStatus.pending,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
    )
    db.commit()
    return trip.id


def _listed_trip_ids(db: Session, driver_id: uuid.UUID) -> set[uuid.UUID]:
    rows = list_available_trips(db=db, driver_id=str(driver_id))
    return {trip.id for trip, _offer in rows}


def test_a_flag_off_blocked_docs_still_visible(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="none")
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id in _listed_trip_ids(db, driver_id)


def test_b_flag_on_compliant_visible(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="compliant")
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id in _listed_trip_ids(db, driver_id)


@pytest.mark.parametrize("doc_mode", ["warning_pending", "warning_expiring"])
def test_c_flag_on_warning_visible(
    db: Session, monkeypatch: pytest.MonkeyPatch, doc_mode: str
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id in _listed_trip_ids(db, driver_id)


@pytest.mark.parametrize("doc_mode", ["none", "blocked_expired", "blocked_rejected"])
def test_d_flag_on_blocked_docs_hidden(
    db: Session, monkeypatch: pytest.MonkeyPatch, doc_mode: str
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id not in _listed_trip_ids(db, driver_id)
    assert _listed_trip_ids(db, driver_id) == set()


def test_e_flag_on_no_active_vehicle_hidden(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver_id = _create_driver(db, active_vehicle_id=None)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id not in _listed_trip_ids(db, driver_id)
    driver = db.get(Driver, driver_id)
    assert driver is not None
    elig = evaluate_driver_new_trip_ops_eligibility(db, driver)
    assert elig.allowed is False
    assert elig.code == CODE_NO_ACTIVE_VEHICLE


def test_f_inactive_hidden_even_flag_off(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="compliant", vehicle_status="inactive")
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id not in _listed_trip_ids(db, driver_id)
    driver = db.get(Driver, driver_id)
    assert driver is not None
    elig = evaluate_driver_new_trip_ops_eligibility(db, driver)
    assert elig.allowed is False
    assert elig.code == CODE_VEHICLE_INACTIVE


def test_g_visible_then_blocked_accept_still_rejects(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="compliant")
    driver_id = _create_driver(db, active_vehicle_id=vid)
    trip_id = _seed_offer_for_driver(db, driver_id)
    assert trip_id in _listed_trip_ids(db, driver_id)

    # Make vehicle non-compliant after list (race).
    docs = list(
        db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == vid)
        ).scalars().all()
    )
    for row in docs:
        db.delete(row)
    db.commit()

    offer = db.execute(
        select(TripOffer).where(
            TripOffer.trip_id == trip_id, TripOffer.driver_id == driver_id
        )
    ).scalar_one()
    with pytest.raises(HTTPException) as ei:
        accept_offer(db=db, driver_id=str(driver_id), offer_id=str(offer.id))
    assert ei.value.status_code == 409
    assert ei.value.detail == CODE_DOCUMENTS_BLOCKED
    # List now also empty (same eligibility).
    assert trip_id not in _listed_trip_ids(db, driver_id)


def test_helper_matches_list_filter(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="compliant")
    driver_id = _create_driver(db, active_vehicle_id=vid)
    driver = db.get(Driver, driver_id)
    assert driver is not None
    assert driver_eligible_for_new_trip_ops(db, driver) is True

    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert driver_eligible_for_new_trip_ops(db, driver) is True
    # BETA does not bypass blocked docs.
    docs = list(
        db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == vid)
        ).scalars().all()
    )
    for row in docs:
        db.delete(row)
    db.commit()
    db.refresh(driver)
    assert driver_eligible_for_new_trip_ops(db, driver) is False
