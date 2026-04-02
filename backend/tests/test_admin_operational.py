"""Tests for admin operational endpoints."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.api.deps import UserContext, get_current_user
from app.main import app
from app.models.enums import Role


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_auth_override() -> None:
    """Inject admin user so /admin/* endpoints return 200 + JSON."""

    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_system_health_requires_auth_401(client: TestClient) -> None:
    r = client.get("/admin/system-health")
    assert r.status_code == 401


def test_metrics_requires_auth_401(client: TestClient) -> None:
    r = client.get("/admin/metrics")
    assert r.status_code == 401


def test_trip_debug_requires_auth_401(client: TestClient) -> None:
    r = client.get("/admin/trip-debug/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


def test_recover_driver_requires_auth_401(client: TestClient) -> None:
    r = client.post("/admin/recover-driver/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


def test_cancel_trip_requires_auth_401(client: TestClient) -> None:
    r = client.post("/admin/cancel-trip/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


@pytest.mark.usefixtures("admin_auth_override")
def test_system_health_returns_expected_structure(client: TestClient) -> None:
    r = client.get("/admin/system-health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") in ("ok", "degraded")
    for key in (
        "stuck_payments",
        "trips_accepted_too_long",
        "trips_ongoing_too_long",
        "drivers_unavailable_too_long",
        "missing_payment_records",
        "inconsistent_financial_state",
        "warnings",
    ):
        assert key in data


@pytest.mark.usefixtures("admin_auth_override")
def test_metrics_returns_expected_structure(client: TestClient) -> None:
    r = client.get("/admin/metrics")
    assert r.status_code == 200
    data = r.json()
    for key in (
        "active_trips",
        "drivers_available",
        "drivers_busy",
        "trips_requested",
        "trips_ongoing",
        "trips_completed_today",
        "trips_created_total",
        "trips_accepted_total",
        "trips_completed_total",
    ):
        assert key in data
