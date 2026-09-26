"""Passenger is a base capability of any active user. Role stays singular."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.session import SessionLocal, engine
from app.models.enums import DriverStatus, OfferStatus, Role, UserStatus
from tests.support.unique_phone import unique_test_phone

# Longe dos motoristas de teste deixados em Lisboa, para o matching ser determinístico.
_LAT = 64.1466
_LNG = -21.9426


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role.value)["token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _user(db: Session, role: Role, *, status: UserStatus = UserStatus.active, partner: bool = False) -> User:
    user = User(
        role=role,
        name=f"{role.value}-{uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=status,
        partner_org_id=DEFAULT_PARTNER_UUID if partner else None,
    )
    db.add(user)
    db.flush()
    return user


def _driver(db: Session, *, lat: float = _LAT, lng: float = _LNG) -> User:
    user = _user(db, Role.driver)
    suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"PB-{suffix}",
        plate_normalized=f"PB{suffix}",
        make="Test",
        model="Cap",
        status="active",
        max_passengers=4,
    )
    db.add(vehicle)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
            vehicle_categories="x",
            active_vehicle_id=vehicle.id,
        )
    )
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(user)
    return user


def _trip_body() -> dict[str, float | str | int]:
    return {
        "origin_lat": _LAT,
        "origin_lng": _LNG,
        "destination_lat": _LAT + 0.02,
        "destination_lng": _LNG + 0.02,
        "vehicle_category": "x",
        "passenger_count": 1,
    }


def _create(client: TestClient, token: str) -> str:
    res = client.post("/trips", json=_trip_body(), headers=_auth(token))
    assert res.status_code == 200, res.text
    return str(res.json()["trip_id"])


def test_passenger_role_still_creates_and_keeps_role(client: TestClient) -> None:
    db = SessionLocal()
    try:
        user = _user(db, Role.passenger)
        db.commit()
        token = _token(user)
        trip_id = _create(client, token)
        got = client.get(f"/trips/{trip_id}", headers=_auth(token))
        assert got.status_code == 200
        db.refresh(user)
        assert user.role == Role.passenger
    finally:
        db.close()


def test_driver_passenger_trip_excludes_self_and_allows_other(client: TestClient) -> None:
    db = SessionLocal()
    try:
        self_driver = _driver(db)
        other = _driver(db)
        now = datetime.now(timezone.utc)
        for driver_id in (self_driver.id, other.id):
            loc = db.get(DriverLocation, driver_id)
            assert loc is not None
            loc.timestamp = now
        db.commit()

        token = _token(self_driver)
        trip_id = _create(client, token)
        got = client.get(f"/trips/{trip_id}", headers=_auth(token))
        assert got.status_code == 200

        check = SessionLocal()
        try:
            self_offers = check.execute(
                select(TripOffer).where(
                    TripOffer.trip_id == uuid.UUID(trip_id),
                    TripOffer.driver_id == self_driver.id,
                )
            ).scalars().all()
            other_offers = check.execute(
                select(TripOffer).where(
                    TripOffer.trip_id == uuid.UUID(trip_id),
                    TripOffer.driver_id == other.id,
                )
            ).scalars().all()
        finally:
            check.close()
        assert self_offers == []
        assert len(other_offers) == 1

        listed = client.get("/driver/offers", headers=_auth(token))
        assert listed.status_code == 200
        assert all(item["trip_id"] != trip_id for item in listed.json())

        forced = TripOffer(
            trip_id=uuid.UUID(trip_id),
            driver_id=self_driver.id,
            status=OfferStatus.pending,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add(forced)
        db.commit()
        db.refresh(forced)
        accepted = client.post(f"/driver/offers/{forced.id}/accept", headers=_auth(token))
        assert accepted.status_code == 409
        assert accepted.json()["detail"] == "cannot_accept_own_trip"
        direct = client.post(f"/driver/trips/{trip_id}/accept", headers=_auth(token))
        assert direct.status_code == 409
        assert direct.json()["detail"] == "cannot_accept_own_trip"

        other_token = _token(other)
        other_listed = client.get("/driver/offers", headers=_auth(other_token))
        assert other_listed.status_code == 200
        assert any(item["trip_id"] == trip_id for item in other_listed.json())

        cancelled = client.post(f"/trips/{trip_id}/cancel", json={}, headers=_auth(token))
        assert cancelled.status_code == 200
        db.refresh(self_driver)
        assert self_driver.role == Role.driver
    finally:
        db.close()


def test_partner_creates_passenger_trip_and_keeps_fleet(client: TestClient) -> None:
    db = SessionLocal()
    try:
        user = _user(db, Role.partner, partner=True)
        db.commit()
        token = _token(user)
        _create(client, token)
        fleet = client.get("/partner/drivers", headers=_auth(token))
        assert fleet.status_code == 200
        admin = client.get("/admin/system-health", headers=_auth(token))
        assert admin.status_code == 403
        db.refresh(user)
        assert user.role == Role.partner
        assert user.partner_org_id == DEFAULT_PARTNER_UUID
    finally:
        db.close()


def test_admin_and_super_admin_create_passenger_trip_and_keep_admin(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = _user(db, Role.admin)
        super_admin = _user(db, Role.super_admin)
        passenger = _user(db, Role.passenger)
        db.commit()
        admin_token = _token(admin)
        super_token = _token(super_admin)
        _create(client, admin_token)
        _create(client, super_token)
        assert client.get("/admin/system-health", headers=_auth(admin_token)).status_code == 200
        assert client.get("/admin/system-health", headers=_auth(super_token)).status_code == 200
        assert client.get("/admin/system-health", headers=_auth(_token(passenger))).status_code == 403
        db.refresh(admin)
        db.refresh(super_admin)
        assert admin.role == Role.admin
        assert super_admin.role == Role.super_admin
    finally:
        db.close()


def test_passenger_endpoints_require_auth_and_active_owner(client: TestClient) -> None:
    db = SessionLocal()
    try:
        owner = _user(db, Role.passenger)
        other = _user(db, Role.passenger)
        pending = _user(db, Role.passenger, status=UserStatus.pending)
        blocked = _user(db, Role.driver, status=UserStatus.blocked)
        db.commit()
        owner_token = _token(owner)
        trip_id = _create(client, owner_token)

        anon = client.post("/trips", json=_trip_body())
        assert anon.status_code == 401

        assert client.post("/trips", json=_trip_body(), headers=_auth(_token(pending))).status_code == 403
        assert client.post("/trips", json=_trip_body(), headers=_auth(_token(blocked))).status_code == 403
        assert client.get(f"/trips/{trip_id}", headers=_auth(_token(pending))).json()["detail"] == "blocked"

        stranger = _token(other)
        assert client.get(f"/trips/{trip_id}", headers=_auth(stranger)).status_code == 404
        assert client.post(f"/trips/{trip_id}/cancel", json={}, headers=_auth(stranger)).status_code == 404

        driverish = client.get("/driver/offers", headers=_auth(owner_token))
        assert driverish.status_code == 403
        assert client.get("/partner/drivers", headers=_auth(owner_token)).status_code == 403
    finally:
        db.close()
