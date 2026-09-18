"""A026 / L-OBS-01 — GET /cron/jobs: auth, success 200, partial_error → HTTP 500."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.main import app
import app.api.routers.cron as cron_router


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_cron_jobs_requires_secret_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "CRON_SECRET", None, raising=False)
    c = TestClient(app)
    r = c.get("/cron/jobs?secret=x")
    assert r.status_code == 503
    assert r.json()["detail"] == "CRON_SECRET not configured"


def test_cron_jobs_rejects_invalid_secret(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "CRON_SECRET", "good_secret", raising=False)
    r = client.get("/cron/jobs?secret=wrong")
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_secret"


def test_cron_jobs_accepts_x_cron_secret_header(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """RFC R3: preferir header em vez de ?secret= (evita leak em logs)."""
    monkeypatch.setattr(settings, "CRON_SECRET", "header_secret_r3", raising=False)
    r = client.get(
        "/cron/jobs",
        headers={"X-Cron-Secret": "header_secret_r3"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ok"


def test_cron_jobs_ok_and_double_call_idempotent(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Duas chamadas seguidas: ambas 200; serviços já são idempotentes (0 alterações se nada preso)."""
    monkeypatch.setattr(settings, "CRON_SECRET", "test_cron_secret_a026", raising=False)
    for _ in range(2):
        r = client.get("/cron/jobs?secret=test_cron_secret_a026")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "ok"
        assert body["errors"] == {}
        assert "timeouts" in body
        assert "offers" in body
        assert "cleanup" in body
        sh = body["system_health"]
        assert sh["status"] in ("ok", "degraded")
        assert "stuck_payments" in sh
        assert "warnings" in sh


def test_cron_jobs_partial_error_returns_http_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """L-OBS-01: one sub-job exception → HTTP 500 + partial_error; others still run."""
    monkeypatch.setattr(settings, "CRON_SECRET", "partial_secret", raising=False)

    def _boom(_db: object) -> None:
        raise RuntimeError("timeouts_boom")

    monkeypatch.setattr(cron_router, "run_trip_timeouts", _boom)

    r = client.get(
        "/cron/jobs",
        headers={"X-Cron-Secret": "partial_secret"},
    )
    assert r.status_code == 500, r.text
    body = r.json()
    assert body["status"] == "partial_error"
    assert "trip_timeouts" in body["errors"]
    assert "timeouts_boom" in body["errors"]["trip_timeouts"]
    assert "timeouts" in body
    assert "offers" in body
    assert "cleanup" in body
    assert "system_health" in body
    assert "driver_zones" in body
    assert "rotacional" in body
    assert "duration_ms" in body
    # Failures are isolated: other keys remain (zeroed for the failed job).
    assert body["timeouts"]["assigned_to_requested"] == 0


def test_cron_jobs_multiple_partial_errors_http_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "CRON_SECRET", "multi_partial_secret", raising=False)

    def _boom_timeouts(_db: object) -> None:
        raise RuntimeError("t1")

    def _boom_cleanup(_db: object) -> None:
        raise RuntimeError("c1")

    monkeypatch.setattr(cron_router, "run_trip_timeouts", _boom_timeouts)
    monkeypatch.setattr(cron_router, "run_cleanup", _boom_cleanup)

    r = client.get(
        "/cron/jobs",
        headers={"X-Cron-Secret": "multi_partial_secret"},
    )
    assert r.status_code == 500, r.text
    body = r.json()
    assert body["status"] == "partial_error"
    assert set(body["errors"].keys()) >= {"trip_timeouts", "cleanup"}
    assert "offers" in body
    assert "system_health" in body


def test_cron_jobs_system_health_degraded_stays_200(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """degraded health payload must not alone force HTTP 500."""
    monkeypatch.setattr(settings, "CRON_SECRET", "degraded_secret", raising=False)

    def _degraded(_db: object) -> dict:
        return {
            "status": "degraded",
            "stuck_payments": [{"id": "p1"}],
            "inconsistent_financial_state": [],
            "missing_payment_records": [],
            "warnings": ["stuck payments"],
        }

    monkeypatch.setattr(cron_router, "run_system_health_check", _degraded)

    r = client.get(
        "/cron/jobs",
        headers={"X-Cron-Secret": "degraded_secret"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert body["errors"] == {}
    assert body["system_health"]["status"] == "degraded"
    assert body["system_health"]["stuck_payments"] == 1
