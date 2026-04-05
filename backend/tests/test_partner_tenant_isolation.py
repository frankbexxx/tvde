"""P07: partner A must not see drivers/trips of partner B."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_two_tenants(db: Session) -> tuple[str, str, str, str, str]:
    """partner_a default UUID; partner_b random. Returns tok_a, tok_b, trip_b_id, driver_b_id, pid_b."""
    pid_a = DEFAULT_PARTNER_UUID
    pid_b = uuid.uuid4()

    db.add(Partner(id=pid_b, name="Fleet B"))
    db.flush()

    u_a = User(
        role=Role.driver,
        name="Driver A",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    u_b = User(
        role=Role.driver,
        name="Driver B",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add_all([u_a, u_b])
    db.flush()

    db.add_all(
        [
            Driver(
                user_id=u_a.id,
                partner_id=pid_a,
                status=DriverStatus.approved,
                commission_percent=15.0,
            ),
            Driver(
                user_id=u_b.id,
                partner_id=pid_b,
                status=DriverStatus.approved,
                commission_percent=15.0,
            ),
        ]
    )
    db.flush()

    pass_b = User(
        role=Role.passenger,
        name="P B",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pass_b)
    db.flush()

    trip_b = Trip(
        passenger_id=pass_b.id,
        driver_id=u_b.id,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip_b)
    db.flush()
    trip_b_id = str(trip_b.id)

    partner_user_a = User(
        role=Role.partner,
        name="Partner Admin A",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
        partner_org_id=pid_a,
    )
    partner_user_b = User(
        role=Role.partner,
        name="Partner Admin B",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
        partner_org_id=pid_b,
    )
    db.add_all([partner_user_a, partner_user_b])
    db.commit()

    tok_a = create_access_token(
        subject=str(partner_user_a.id), role=partner_user_a.role.value
    )["token"]
    tok_b = create_access_token(
        subject=str(partner_user_b.id), role=partner_user_b.role.value
    )["token"]
    return tok_a, tok_b, trip_b_id, str(u_b.id), str(pid_b)


def test_partner_api_cross_tenant_isolation() -> None:
    db = SessionLocal()
    try:
        tok_a, tok_b, trip_b_id, driver_b_id, pid_b = _seed_two_tenants(db)
    finally:
        db.close()

    client = TestClient(app)

    r_trips_a = client.get(
        "/partner/trips",
        headers={"Authorization": f"Bearer {tok_a}"},
    )
    r_trips_b = client.get(
        "/partner/trips",
        headers={"Authorization": f"Bearer {tok_b}"},
    )
    assert r_trips_a.status_code == 200
    assert r_trips_b.status_code == 200
    ids_a = {t["trip_id"] for t in r_trips_a.json()}
    ids_b = {t["trip_id"] for t in r_trips_b.json()}
    assert trip_b_id in ids_b
    assert trip_b_id not in ids_a
    assert ids_a.isdisjoint(ids_b)

    r_da = client.get("/partner/drivers", headers={"Authorization": f"Bearer {tok_a}"})
    r_db = client.get("/partner/drivers", headers={"Authorization": f"Bearer {tok_b}"})
    assert r_da.status_code == 200 and r_db.status_code == 200
    users_a = {d["user_id"] for d in r_da.json()}
    users_b = {d["user_id"] for d in r_db.json()}
    assert driver_b_id in users_b
    assert driver_b_id not in users_a
    assert users_a.isdisjoint(users_b)
    for row in r_db.json():
        assert row["partner_id"] == pid_b
    for row in r_da.json():
        assert row["partner_id"] == str(DEFAULT_PARTNER_UUID)


def test_partner_endpoint_rejects_driver_token() -> None:
    db = SessionLocal()
    u = User(
        role=Role.driver,
        name="D",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    db.add(
        Driver(
            user_id=u.id,
            partner_id=DEFAULT_PARTNER_UUID,
            status=DriverStatus.approved,
            commission_percent=15.0,
        )
    )
    db.commit()
    tok = create_access_token(subject=str(u.id), role=u.role.value)["token"]
    db.close()

    client = TestClient(app)
    r = client.get("/partner/trips", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
