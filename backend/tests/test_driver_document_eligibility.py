"""Documentos obrigatórios do motorista bloqueiam novas operações."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.main import app
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.driver_documents import (
    DRIVER_DOCUMENTS_INCOMPLETE,
    documents_blob_with_status,
    driver_required_documents_approved,
)
from app.services.offer_dispatch import create_offers_for_trip
from app.services.trips import accept_offer
from tests.support.unique_phone import unique_test_phone


def _create_driver(db: Session, *, lat: float, lng: float, documents: str | None = None) -> str:
    user = User(
        role=Role.driver,
        name=f"Docs {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        vehicle_categories="x",
        documents=documents,
    )
    db.add(driver)
    db.flush()
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return str(user.id)


def _create_trip(db: Session, *, status: TripStatus = TripStatus.requested, driver_id: str | None = None) -> Trip:
    passenger = User(
        role=Role.passenger,
        name="P",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
        vehicle_category="x",
        driver_id=uuid.UUID(driver_id) if driver_id else None,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _clear_locations(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()


def test_pending_status_is_not_approved(db: Session) -> None:
    driver_id = _create_driver(db, lat=38.701, lng=-9.101)
    driver = db.get(Driver, uuid.UUID(driver_id))
    assert driver is not None
    raw = json.loads(documents_blob_with_status("approved"))
    raw["docs"]["carta_tvde"]["status"] = "pending"
    driver.documents = json.dumps(raw)
    db.commit()
    assert driver_required_documents_approved(driver) is False


@pytest.mark.parametrize("status_name", ["pending_review", "rejected", "expired", "missing"])
def test_go_online_refuses_unapproved_documents(db: Session, status_name: str) -> None:
    driver_id = _create_driver(
        db,
        lat=38.701,
        lng=-9.101,
        documents=documents_blob_with_status(status_name),
    )
    driver = db.get(Driver, uuid.UUID(driver_id))
    assert driver is not None
    driver.is_available = True
    db.commit()

    user_ctx = UserContext(user_id=driver_id, role=Role.driver)

    async def override_user() -> UserContext:
        return user_ctx

    def override_db():
        yield db

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    try:
        response = TestClient(app).post("/driver/status/online")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 409
    assert response.json()["detail"] == DRIVER_DOCUMENTS_INCOMPLETE
    db.refresh(driver)
    assert driver.is_available is False


def test_go_online_allows_approved_documents(db: Session) -> None:
    driver_id = _create_driver(
        db,
        lat=38.701,
        lng=-9.101,
        documents=documents_blob_with_status("approved"),
    )
    driver = db.get(Driver, uuid.UUID(driver_id))
    assert driver is not None
    driver.is_available = False
    db.commit()
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)

    async def override_user() -> UserContext:
        return user_ctx

    def override_db():
        yield db

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    try:
        response = TestClient(app).post("/driver/status/online")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["is_available"] is True


def test_matching_skips_stale_available_driver_without_documents(db: Session) -> None:
    _clear_locations(db)
    blocked_id = _create_driver(
        db,
        lat=38.701,
        lng=-9.101,
        documents=documents_blob_with_status("pending_review"),
    )
    eligible_id = _create_driver(
        db,
        lat=38.702,
        lng=-9.102,
        documents=documents_blob_with_status("approved"),
    )
    trip = _create_trip(db)

    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()

    assert [str(offer.driver_id) for offer in offers] == [eligible_id]
    blocked = (
        db.execute(select(TripOffer).where(TripOffer.driver_id == uuid.UUID(blocked_id)))
        .scalars()
        .all()
    )
    assert blocked == []


def test_accept_offer_refuses_after_documents_become_invalid(db: Session) -> None:
    driver_id = _create_driver(db, lat=38.701, lng=-9.101)
    active = _create_trip(db, status=TripStatus.ongoing, driver_id=driver_id)
    fresh = _create_trip(db)
    offer = TripOffer(
        trip_id=fresh.id,
        driver_id=uuid.UUID(driver_id),
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.add(offer)
    driver = db.get(Driver, uuid.UUID(driver_id))
    assert driver is not None
    driver.documents = documents_blob_with_status("rejected")
    driver.is_available = True
    db.commit()
    db.refresh(offer)

    with pytest.raises(HTTPException) as exc_info:
        accept_offer(db=db, driver_id=driver_id, offer_id=str(offer.id))

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == DRIVER_DOCUMENTS_INCOMPLETE
    db.refresh(active)
    db.refresh(fresh)
    assert active.status == TripStatus.ongoing
    assert fresh.status == TripStatus.requested
    assert fresh.driver_id is None
