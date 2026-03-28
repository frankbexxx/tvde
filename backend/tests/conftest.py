"""Pytest fixtures for admin operational tests."""

import os

# A012: Quiet operational logs during pytest; must run before `from app.main import app`.
os.environ["ENV"] = "test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.migrations_runner import upgrade_to_head
from app.db.session import SessionLocal
from app.main import app


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
