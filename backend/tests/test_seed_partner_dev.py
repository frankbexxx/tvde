"""DEV seed creates partner + drivers + partner admin."""

from __future__ import annotations

import pytest
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.services.seed_partner_dev import run_partner_pilot_seed


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_run_partner_pilot_seed_inserts_rows() -> None:
    db = SessionLocal()
    try:
        out = run_partner_pilot_seed(db)
        pid = out["partner_id"]
        assert db.execute(
            text("SELECT 1 FROM partners WHERE id = :id"),
            {"id": pid},
        ).scalar_one()
        assert len(out["driver_user_ids"]) == 2
    finally:
        db.close()
