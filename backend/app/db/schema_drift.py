"""Detect Alembic schema drift without applying migrations.

Used by local/dev startup (warn-only) and Windows diagnostics.
Never calls ``upgrade`` / ``downgrade``.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

_BACKEND_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SchemaDriftStatus:
    alembic_current: str | None
    alembic_heads: tuple[str, ...]
    in_sync: bool


def compute_in_sync(current: str | None, heads: tuple[str, ...]) -> bool:
    """True only when DB revision equals the single code head."""
    if current is None or len(heads) != 1:
        return False
    return current == heads[0]


def drift_warning_message(status: SchemaDriftStatus) -> str:
    """Exact human-facing warning for schema drift (startup / scripts)."""
    cur = status.alembic_current or "(none)"
    heads = ",".join(status.alembic_heads) if status.alembic_heads else "(none)"
    return (
        f"[WARN] SCHEMA DRIFT: db={cur} code_head={heads} — "
        "ORM may 500 until alembic upgrade head "
        "(requires explicit authorization; "
        "dev startup will NOT auto-migrate)."
    )


def _alembic_cfg(backend_dir: Path) -> Config:
    return Config(str(backend_dir / "alembic.ini"))


def code_heads(backend_dir: Path | None = None) -> tuple[str, ...]:
    root = backend_dir or _BACKEND_DIR
    script = ScriptDirectory.from_config(_alembic_cfg(root))
    return tuple(sorted(script.get_heads()))


def db_current_revision(database_url: str) -> str | None:
    engine = create_engine(database_url)
    try:
        with engine.connect() as conn:
            return conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    finally:
        engine.dispose()


def check_schema_drift(
    *,
    database_url: str | None = None,
    backend_dir: Path | None = None,
) -> SchemaDriftStatus:
    """Compare ``alembic_version`` to code heads. Does not mutate the database."""
    from app.core.config import settings

    url = database_url if database_url is not None else settings.DATABASE_URL
    heads = code_heads(backend_dir)
    current = db_current_revision(url)
    return SchemaDriftStatus(
        alembic_current=current,
        alembic_heads=heads,
        in_sync=compute_in_sync(current, heads),
    )
