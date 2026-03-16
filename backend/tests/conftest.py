"""Pytest fixtures for admin operational tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.main import app


def _ensure_schema_columns() -> None:
    """Apply dev/BETA schema columns so tests can run."""
    try:
        with engine.connect() as conn:
            for stmt in [
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(280)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(16)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_rating INTEGER",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_rating INTEGER",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating_as_passenger NUMERIC(3,2)",
            ]:
                conn.execute(text(stmt))
            conn.commit()
    except Exception:
        pass


@pytest.fixture(scope="session", autouse=True)
def _schema_columns() -> None:
    _ensure_schema_columns()


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
