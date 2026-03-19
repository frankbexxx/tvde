"""Tests for admin operational endpoints."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_system_health_returns_structure(client: TestClient) -> None:
    """system-health requires auth (401 without Bearer token)."""
    r = client.get("/admin/system-health")
    assert r.status_code == 401  # No Bearer token


def test_metrics_returns_structure(client: TestClient) -> None:
    """metrics requires auth (401 without Bearer token)."""
    r = client.get("/admin/metrics")
    assert r.status_code == 401


def test_trip_debug_returns_401_without_auth(client: TestClient) -> None:
    """trip-debug requires auth (401 without Bearer token)."""
    r = client.get("/admin/trip-debug/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


def test_recover_driver_requires_auth(client: TestClient) -> None:
    """recover-driver requires auth (401 without Bearer token)."""
    r = client.post("/admin/recover-driver/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


def test_cancel_trip_requires_auth(client: TestClient) -> None:
    """cancel-trip requires auth (401 without Bearer token)."""
    r = client.post("/admin/cancel-trip/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401
