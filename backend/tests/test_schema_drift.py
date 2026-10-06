"""Unit tests for Alembic schema-drift helper (no upgrade; no remote DB required)."""

from __future__ import annotations

from app.db.schema_drift import (
    SchemaDriftStatus,
    compute_in_sync,
    drift_warning_message,
)


def test_compute_in_sync_true_when_current_equals_single_head() -> None:
    assert compute_in_sync("f9a0b1c2d3e4", ("f9a0b1c2d3e4",)) is True


def test_compute_in_sync_false_when_behind_head() -> None:
    assert compute_in_sync("c4d5e6f7a8b9", ("f9a0b1c2d3e4",)) is False


def test_compute_in_sync_false_when_missing_current_or_multiple_heads() -> None:
    assert compute_in_sync(None, ("f9a0b1c2d3e4",)) is False
    assert compute_in_sync("f9a0b1c2d3e4", ()) is False
    assert compute_in_sync("a", ("a", "b")) is False


def test_drift_warning_message_exact_shape() -> None:
    status = SchemaDriftStatus(
        alembic_current="c4d5e6f7a8b9",
        alembic_heads=("f9a0b1c2d3e4",),
        in_sync=False,
    )
    msg = drift_warning_message(status)
    assert msg == (
        "[WARN] SCHEMA DRIFT: db=c4d5e6f7a8b9 code_head=f9a0b1c2d3e4 — "
        "ORM may 500 until alembic upgrade head "
        "(dev startup applies it on local ride_db)."
    )
