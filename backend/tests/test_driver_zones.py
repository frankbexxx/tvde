"""Driver zone sessions API (v1 skeleton)."""

import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.driver_zone_day_budget import DriverZoneDayBudget
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus


def _make_db() -> Session:
    return SessionLocal()


def _create_driver(db: Session) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
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
        is_available=True,
    )
    db.add(driver)
    db.commit()
    return str(user.id)


def _override_deps(db: Session, user_ctx: UserContext) -> None:
    async def override_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


def test_zone_budget_today_defaults() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.get("/driver/zones/budget/today")
        assert r.status_code == 200
        data = r.json()
        assert data["used_changes"] == 0
        assert data["max_changes"] == 2
        assert data["remaining"] == 2
        assert data["timezone"] == "Europe/Lisbon"
        assert "service_date" in data
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_create_and_conflict_open() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r1 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "portimao", "eta_seconds_baseline": 600, "eta_margin_percent": 25},
        )
        assert r1.status_code == 201
        body = r1.json()
        assert body["zone_id"] == "portimao"
        assert body["status"] == "open"

        r2 = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "faro", "eta_seconds_baseline": 300, "eta_margin_percent": 10},
        )
        assert r2.status_code == 409
        assert r2.json()["detail"] == "zone_session_already_open"
    finally:
        _reset_overrides()
        db.close()


def test_zone_session_budget_exhausted() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    uid = uuid.UUID(driver_id)
    sd = date.today()
    db.add(
        DriverZoneDayBudget(
            driver_id=uid,
            service_date=sd,
            used_changes_count=2,
            max_changes_count=2,
            timezone="Europe/Lisbon",
        )
    )
    db.commit()

    _override_deps(db, UserContext(user_id=driver_id, role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post(
            "/driver/zones/sessions",
            json={"zone_id": "lisboa", "eta_seconds_baseline": 120, "eta_margin_percent": 0},
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "zone_change_budget_exhausted"
    finally:
        _reset_overrides()
        db.close()
