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

from app.db.migrations_runner import upgrade_to_head  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _alembic_upgrade_session() -> None:
    """Schema from Alembic (CI + local PostgreSQL)."""
    upgrade_to_head()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
