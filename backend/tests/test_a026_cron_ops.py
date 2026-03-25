"""A026 — GET /cron/jobs: auth por secret, idempotência básica (dupla chamada)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.main import app


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
        assert "timeouts" in body
        assert "offers" in body
        assert "cleanup" in body
