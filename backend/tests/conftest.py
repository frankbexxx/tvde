"""Pytest fixtures for admin operational tests."""

from __future__ import annotations

import os

# A012: Quiet operational logs during pytest; must run before `from app.main import app`.
os.environ["ENV"] = "test"

# TEST-DB-GUARD-1: refuse remote/Render DB before any app/db/Alembic import.
from tests.support.test_db_guard import (  # noqa: E402
    assert_safe_test_database_for_pytest,
    backend_root_from_conftest,
)

assert_safe_test_database_for_pytest(backend_root=backend_root_from_conftest(__file__))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from sqlalchemy import event  # noqa: E402

from app.db.migrations_runner import upgrade_to_head  # noqa: E402
from app.db.models.driver import Driver  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.core.config import Settings  # noqa: E402
from app.services.driver_documents import approved_driver_documents_blob  # noqa: E402


@pytest.fixture(autouse=True)
def _pytest_stripe_webhook_secret_from_env(
    request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Pytest has no supervised listener; use STRIPE_WEBHOOK_SECRET when set."""
    mod = getattr(request.module, "__name__", "")
    if mod.endswith("test_stripe_webhook_dev_secret"):
        return

    def _effective(self: Settings) -> str | None:
        wh = (self.STRIPE_WEBHOOK_SECRET or "").strip()
        return wh or None

    monkeypatch.setattr(Settings, "effective_stripe_webhook_secret", _effective)


@event.listens_for(Driver, "before_insert")
def _test_drivers_default_to_approved_documents(mapper, connection, target) -> None:  # noqa: ARG001
    """Os testes históricos criam motoristas sem coluna de documentos.

    Em produção essa coluna vazia é inelegível. Aqui, omissão significa
    documentos aprovados, para não mudar o significado dos testes antigos.
    Quem define `documents` explicitamente mantém esse valor.
    """
    if target.documents is None:
        target.documents = approved_driver_documents_blob()


@pytest.fixture(scope="session", autouse=True)
def _alembic_upgrade_session() -> None:
    """Schema from Alembic (CI + local PostgreSQL)."""
    upgrade_to_head()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_auth_rate_buckets() -> None:
    """Os limites de auth são em memória e partilhados pelo processo de testes."""
    from app.api.auth_rate_limit import _buckets

    _buckets.clear()
    yield
    _buckets.clear()


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
