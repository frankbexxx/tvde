"""Partner inbox messages — basic API."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_partner_message_to_driver_and_read() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Fleet Inbox"))
        u_d = User(
            role=Role.driver,
            name="Inbox Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Inbox Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
        driver_tok = create_access_token(subject=str(u_d.id), role=u_d.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r = c.post(
        "/partner/messages",
        json={
            "title": "Teste",
            "body": "Olá motorista",
            "priority": "high",
            "driver_user_id": driver_id,
        },
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 201
    msg_id = r.json()["id"]

    r2 = c.get("/driver/messages", headers={"Authorization": f"Bearer {driver_tok}"})
    assert r2.status_code == 200
    assert any(row["id"] == msg_id and row["read"] is False for row in r2.json())

    r3 = c.patch(
        f"/driver/messages/{msg_id}/read",
        headers={"Authorization": f"Bearer {driver_tok}"},
    )
    assert r3.status_code == 204

    r4 = c.get("/driver/messages", headers={"Authorization": f"Bearer {driver_tok}"})
    assert any(row["id"] == msg_id and row["read"] is True for row in r4.json())
