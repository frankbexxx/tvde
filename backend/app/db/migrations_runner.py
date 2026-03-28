"""Run Alembic upgrades programmatically (startup + pytest session)."""

from pathlib import Path

from alembic import command
from alembic.config import Config

_BACKEND_DIR = Path(__file__).resolve().parents[2]


def upgrade_to_head() -> None:
    """Apply all pending migrations to head."""
    ini = _BACKEND_DIR / "alembic.ini"
    cfg = Config(str(ini))
    command.upgrade(cfg, "head")
