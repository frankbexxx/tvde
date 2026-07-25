"""PF3D-3A: vehicle document compliance gates behind ENABLE_VEHICLE_COMPLIANCE_GATES."""

from __future__ import annotations

import inspect
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.main import app
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.schemas.partner import PartnerVehicleDocumentSummary
from app.services import partner_vehicles, trips
from app.services.offer_dispatch import create_offers_for_trip
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.trips import accept_offer, start_trip
from app.services.vehicle_compliance_gate import (
    CODE_DOCUMENTS_BLOCKED,
    CODE_GATES_DISABLED,
    CODE_NO_ACTIVE_VEHICLE,
    CODE_OK,
    CODE_UNKNOWN,
    CODE_WARNING,
    assert_driver_vehicle_compliance_for_accept,
    batch_evaluate_driver_vehicle_compliance_gates,
    evaluate_driver_vehicle_compliance_gate,
)


def _summary(
    *,
    worst_status: str,
    missing_count: int = 0,
    expired_count: int = 0,
    expiring_soon_count: int = 0,
    pending_review_count: int = 0,
    rejected_count: int = 0,
    valid_count: int = 0,
    present_count: int | None = None,
    total_required: int = 4,
) -> PartnerVehicleDocumentSummary:
    present = present_count if present_count is not None else total_required - missing_count
    return PartnerVehicleDocumentSummary(
        total_required=total_required,
        present_count=present,
        missing_count=missing_count,
        expired_count=expired_count,
        expiring_soon_count=expiring_soon_count,
        pending_review_count=pending_review_count,
        rejected_count=rejected_count,
        valid_count=valid_count,
        worst_status=worst_status,
    )


def _driver_stub(*, active_vehicle_id: uuid.UUID | None = None) -> Driver:
    d = MagicMock(spec=Driver)
    d.user_id = uuid.uuid4()
    d.partner_id = DEFAULT_PARTNER_UUID
    d.active_vehicle_id = active_vehicle_id
    return d


# --- config / helper unit ---


def test_flag_defaults_false() -> None:
    assert settings.ENABLE_VEHICLE_COMPLIANCE_GATES is False


def test_gate_off_allows_without_db(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    driver = _driver_stub(active_vehicle_id=None)
    db = MagicMock()
    result = evaluate_driver_vehicle_compliance_gate(db, driver)
    assert result.allowed is True
    assert result.code == CODE_GATES_DISABLED
    db.execute.assert_not_called()


def test_gate_on_no_active_vehicle(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver = _driver_stub(active_vehicle_id=None)
    result = evaluate_driver_vehicle_compliance_gate(MagicMock(), driver)
    assert result.allowed is False
    assert result.code == CODE_NO_ACTIVE_VEHICLE


def test_gate_on_blocked_docs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = uuid.uuid4()
    driver = _driver_stub(active_vehicle_id=vid)
    result = evaluate_driver_vehicle_compliance_gate(
        MagicMock(),
        driver,
        summary=_summary(worst_status="missing", missing_count=4, present_count=0),
        summary_provided=True,
    )
    assert result.allowed is False
    assert result.code == CODE_DOCUMENTS_BLOCKED
    assert result.vehicle_id == str(vid)


def test_gate_on_warning_allows(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver = _driver_stub(active_vehicle_id=uuid.uuid4())
    result = evaluate_driver_vehicle_compliance_gate(
        MagicMock(),
        driver,
        summary=_summary(
            worst_status="expiring_soon",
            expiring_soon_count=1,
            valid_count=3,
            present_count=4,
        ),
        summary_provided=True,
    )
    assert result.allowed is True
    assert result.code == CODE_WARNING


def test_gate_on_compliant_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver = _driver_stub(active_vehicle_id=uuid.uuid4())
    result = evaluate_driver_vehicle_compliance_gate(
        MagicMock(),
        driver,
        summary=_summary(worst_status="valid", valid_count=4, present_count=4),
        summary_provided=True,
    )
    assert result.allowed is True
    assert result.code == CODE_OK


def test_gate_on_unknown_blocks(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver = _driver_stub(active_vehicle_id=uuid.uuid4())
    result = evaluate_driver_vehicle_compliance_gate(
        MagicMock(),
        driver,
        summary=None,
        summary_provided=True,
    )
    assert result.allowed is False
    assert result.code == CODE_UNKNOWN


def test_batch_off_skips_queries(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    db = MagicMock()
    drivers = [_driver_stub(), _driver_stub()]
    out = batch_evaluate_driver_vehicle_compliance_gates(db, drivers)
    assert len(out) == 2
    assert all(r.allowed and r.code == CODE_GATES_DISABLED for r in out.values())
    db.execute.assert_not_called()


def test_start_trip_and_assign_have_no_gate() -> None:
    assert "vehicle_compliance" not in inspect.getsource(start_trip)
    assert "vehicle_compliance" not in inspect.getsource(
        partner_vehicles.assign_vehicle_to_driver
    )
    assert "assert_driver_vehicle_compliance" not in inspect.getsource(start_trip)


# --- DB helpers ---


def _clear_locations(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()


def _create_vehicle_with_docs(
    db: Session,
    *,
    doc_mode: str = "compliant",
) -> uuid.UUID:
    plate_suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"PF3D-{plate_suffix}",
        plate_normalized=f"PF3D{plate_suffix}",
        make="Test",
        model="Gate",
        status="active",
    )
    db.add(vehicle)
    db.flush()
    now = datetime.now(timezone.utc)
    if doc_mode == "none":
        db.commit()
        return vehicle.id
    for i, doc_type in enumerate(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED):
        status = "approved"
        expires_at = now + timedelta(days=365)
        if doc_mode == "blocked_expired" and i == 0:
            expires_at = now - timedelta(days=1)
        elif doc_mode == "blocked_rejected" and i == 0:
            status = "rejected"
            expires_at = now + timedelta(days=365)
        elif doc_mode == "warning_pending" and i == 0:
            status = "pending_review"
            expires_at = now + timedelta(days=365)
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
    lat: float = 38.701,
    lng: float = -9.101,
    is_available: bool = True,
    active_vehicle_id: uuid.UUID | None = None,
    with_location: bool = True,
) -> str:
    user = User(
        role=Role.driver,
        name=f"PF3D3A {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=is_available,
        vehicle_categories="x",
        active_vehicle_id=active_vehicle_id,
    )
    db.add(driver)
    db.flush()
    if with_location:
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


def _create_requested_trip(db: Session) -> Trip:
    passenger = User(
        role=Role.passenger,
        name="PF3D3A P",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _override_driver_client(db: Session, driver_id: str) -> TestClient:
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)

    async def override_get_current_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


# --- go_online ---


def test_go_online_flag_off_no_vehicle(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    driver_id = _create_driver(db, is_available=False, with_location=False)
    client = _override_driver_client(db, driver_id)
    try:
        r = client.post("/driver/status/online")
        assert r.status_code == 200
        assert r.json()["is_available"] is True
    finally:
        _reset_overrides()


def test_go_online_flag_on_blocks_no_vehicle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver_id = _create_driver(db, is_available=False, with_location=False)
    client = _override_driver_client(db, driver_id)
    try:
        r = client.post("/driver/status/online")
        assert r.status_code == 409
        assert r.json()["detail"] == CODE_NO_ACTIVE_VEHICLE
        driver = db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_id))
        ).scalar_one()
        assert driver.is_available is False
    finally:
        _reset_overrides()


@pytest.mark.parametrize(
    "doc_mode,expect_ok,detail",
    [
        ("none", False, CODE_DOCUMENTS_BLOCKED),
        ("blocked_expired", False, CODE_DOCUMENTS_BLOCKED),
        ("blocked_rejected", False, CODE_DOCUMENTS_BLOCKED),
        ("warning_pending", True, None),
        ("warning_expiring", True, None),
        ("compliant", True, None),
    ],
)
def test_go_online_flag_on_docs(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    doc_mode: str,
    expect_ok: bool,
    detail: str | None,
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(
        db, is_available=False, with_location=False, active_vehicle_id=vid
    )
    client = _override_driver_client(db, driver_id)
    try:
        r = client.post("/driver/status/online")
        if expect_ok:
            assert r.status_code == 200
            assert r.json()["is_available"] is True
        else:
            assert r.status_code == 409
            assert r.json()["detail"] == detail
    finally:
        _reset_overrides()


# --- matching ---


def test_matching_flag_off_includes_no_vehicle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    _clear_locations(db)
    driver_id = _create_driver(db, active_vehicle_id=None)
    trip = _create_requested_trip(db)
    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()
    assert len(offers) == 1
    assert str(offers[0].driver_id) == driver_id


def test_matching_flag_on_excludes_no_vehicle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    _clear_locations(db)
    _create_driver(db, active_vehicle_id=None)
    trip = _create_requested_trip(db)
    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()
    assert offers == []


def test_matching_flag_on_excludes_blocked_docs(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    _clear_locations(db)
    blocked_vid = _create_vehicle_with_docs(db, doc_mode="blocked_expired")
    ok_vid = _create_vehicle_with_docs(db, doc_mode="compliant")
    _create_driver(db, lat=38.701, lng=-9.101, active_vehicle_id=blocked_vid)
    ok_id = _create_driver(db, lat=38.702, lng=-9.102, active_vehicle_id=ok_vid)
    trip = _create_requested_trip(db)
    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()
    assert len(offers) == 1
    assert str(offers[0].driver_id) == ok_id


# --- accept ---


def test_accept_flag_off_allows_no_vehicle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    driver_id = _create_driver(db, active_vehicle_id=None, with_location=False)
    trip = _create_requested_trip(db)
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=uuid.UUID(driver_id),
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    accepted, _ = accept_offer(db=db, driver_id=driver_id, offer_id=str(offer.id))
    assert accepted.status == TripStatus.accepted


def test_accept_flag_on_blocks_blocked_docs(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="blocked_rejected")
    driver_id = _create_driver(db, active_vehicle_id=vid, with_location=False)
    trip = _create_requested_trip(db)
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=uuid.UUID(driver_id),
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    with pytest.raises(HTTPException) as exc:
        accept_offer(db=db, driver_id=driver_id, offer_id=str(offer.id))
    assert exc.value.status_code == 409
    assert exc.value.detail == CODE_DOCUMENTS_BLOCKED


@pytest.mark.parametrize("doc_mode", ["warning_pending", "compliant"])
def test_accept_flag_on_allows_warning_or_compliant(
    db: Session, monkeypatch: pytest.MonkeyPatch, doc_mode: str
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(db, active_vehicle_id=vid, with_location=False)
    trip = _create_requested_trip(db)
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=uuid.UUID(driver_id),
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    accepted, _ = accept_offer(db=db, driver_id=driver_id, offer_id=str(offer.id))
    assert accepted.status == TripStatus.accepted


def test_assert_accept_noop_when_flag_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    assert_driver_vehicle_compliance_for_accept(MagicMock(), _driver_stub())


def test_trips_module_wires_accept_not_start() -> None:
    src = inspect.getsource(trips)
    assert "assert_driver_vehicle_compliance_for_accept" in src
    assert "assert_driver_vehicle_compliance_for_accept" not in inspect.getsource(start_trip)
