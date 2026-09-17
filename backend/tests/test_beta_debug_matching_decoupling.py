"""Phase B3: ENABLE_DEBUG_ROUTES + ENABLE_BETA_MATCHING_FALLBACKS (BETA-independent)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_location import (
    _ensure_driver_profile,
    get_driver_location_for_trip,
    upsert_driver_location,
)
from tests.support.unique_phone import unique_test_phone


def test_debug_flag_matrix_deployed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENV", "production", raising=False)

    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", None, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert settings.debug_router_enabled() is True  # compat

    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.debug_router_enabled() is False

    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", True, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.debug_router_enabled() is True

    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", False, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert settings.debug_router_enabled() is False


def test_debug_local_always_mounted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", None, raising=False)
    monkeypatch.setattr(settings, "ENV", "test", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", False, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.is_deployed_environment() is False
    assert settings.debug_router_enabled() is True


def test_matching_fallbacks_flag_independent_of_beta(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", None, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert settings.beta_matching_fallbacks_enabled() is True
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.beta_matching_fallbacks_enabled() is False

    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    assert settings.beta_matching_fallbacks_enabled() is True

    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", False, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    assert settings.beta_matching_fallbacks_enabled() is False


def test_auto_driver_requires_matching_fallbacks(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", False, raising=False)
    uid = uuid.uuid4()
    db.add(
        User(
            id=uid,
            role=Role.driver,
            name="NoProfile",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
    )
    db.commit()
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as ei:
        _ensure_driver_profile(db, str(uid))
    assert ei.value.status_code == 404

    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)
    driver = _ensure_driver_profile(db, str(uid))
    assert driver.status == DriverStatus.approved
    assert driver.partner_id == DEFAULT_PARTNER_UUID


def test_auto_assign_follows_matching_fallbacks_not_beta(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()

    passenger = User(
        role=Role.passenger,
        name="P",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_u = User(
        role=Role.driver,
        name="D",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, driver_u])
    db.flush()
    driver = Driver(
        user_id=driver_u.id,
        partner_id=DEFAULT_PARTNER_UUID,
        status=DriverStatus.approved,
        commission_percent=15,
        is_available=True,
    )
    db.add(driver)
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
    )
    trip.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db.add(trip)
    db.commit()

    # Far from origin → 0 offers; fallbacks ON → assigned pool
    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    upsert_driver_location(
        db=db,
        driver_id=str(driver_u.id),
        lat=41.15,
        lng=-8.61,
        timestamp_ms=ts_ms,
    )
    db.refresh(trip)
    assert trip.status == TripStatus.assigned
    assert trip.driver_id is None

    # Fallbacks OFF → no promote
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", False, raising=False)
    trip2 = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
    )
    trip2.created_at = datetime.now(timezone.utc) - timedelta(hours=3)
    db.add(trip2)
    db.commit()
    upsert_driver_location(
        db=db,
        driver_id=str(driver_u.id),
        lat=41.15,
        lng=-8.61,
        timestamp_ms=ts_ms + 1000,
    )
    db.refresh(trip2)
    assert trip2.status == TripStatus.requested


def test_gps_ownership_strict_when_fallbacks_off(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    from fastapi import HTTPException

    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", False, raising=False)

    passenger = User(
        role=Role.passenger,
        name="OwnP",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    stranger = User(
        role=Role.passenger,
        name="Stranger",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_u = User(
        role=Role.driver,
        name="OwnD",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, stranger, driver_u])
    db.flush()
    db.add(
        Driver(
            user_id=driver_u.id,
            partner_id=DEFAULT_PARTNER_UUID,
            status=DriverStatus.approved,
            commission_percent=15,
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_u.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
    )
    db.add(trip)
    db.add(
        DriverLocation(
            driver_id=driver_u.id,
            lat=38.71,
            lng=-9.11,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()

    with pytest.raises(HTTPException) as ei:
        get_driver_location_for_trip(
            db=db,
            trip_id=str(trip.id),
            user_id=str(stranger.id),
            role=Role.passenger,
        )
    assert ei.value.status_code == 403

    # Same BETA=true but fallbacks ON → trip passenger allowed even with mismatched role claim
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)
    lat, lng, _ts = get_driver_location_for_trip(
        db=db,
        trip_id=str(trip.id),
        user_id=str(passenger.id),
        role=Role.driver,
    )
    assert float(lat) == pytest.approx(38.71, abs=0.01)
    assert float(lng) == pytest.approx(-9.11, abs=0.01)


def test_debug_endpoint_deployed_flag_true_requires_auth(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", True, raising=False)
    rid = uuid.uuid4()
    r = client.get(f"/debug/trip/{rid}/logs")
    # Mounted access allowed → auth required (not debug_not_available)
    assert r.status_code == 401
    assert r.json()["detail"] == "not_authenticated"


def test_prod_compat_unset_flags_follow_beta(monkeypatch: pytest.MonkeyPatch) -> None:
    """Current Render (no new env vars, BETA=true) keeps previous effective behaviour."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENV", "production", raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEBUG_ROUTES", None, raising=False)
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", None, raising=False)
    assert settings.debug_router_enabled() is True
    assert settings.beta_matching_fallbacks_enabled() is True
