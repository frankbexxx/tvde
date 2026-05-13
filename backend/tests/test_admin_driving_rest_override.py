"""Admin override de driving_rest_until (decisão EXTRA 4 — auditoria SP-F)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.user import User
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_auth_override() -> None:
    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _make_driver(db: Session) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"Rest {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
        is_available=True,
        driving_rest_until=None,
    )
    db.add(d)
    db.commit()
    return user.id


@pytest.mark.usefixtures("admin_auth_override")
def test_driving_rest_override_set_and_clear(client: TestClient, db: Session) -> None:
    uid = _make_driver(db)
    until = datetime.now(timezone.utc) + timedelta(hours=2)
    r = client.post(
        f"/admin/drivers/{uid}/driving-rest-override",
        json={
            "governance_reason": "teste integração override repouso",
            "rest_until": until.isoformat(),
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["driver_id"] == str(uid)
    assert data["driving_rest_until"] is not None

    db.expire_all()
    row = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
    assert row.driving_rest_until is not None

    r2 = client.post(
        f"/admin/drivers/{uid}/driving-rest-override",
        json={
            "governance_reason": "limpar override após teste integração",
            "rest_until": None,
        },
    )
    assert r2.status_code == 200, r2.text
    db.expire_all()
    row2 = db.execute(select(Driver).where(Driver.user_id == uid)).scalar_one()
    assert row2.driving_rest_until is None
