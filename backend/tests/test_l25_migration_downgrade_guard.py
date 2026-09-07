"""L-25 migration downgrade guard — block when external rows lack user_id."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.db.models.complaint import Complaint, ComplaintHistory
from app.db.models.user import User
from app.models.enums import (
    ComplaintCategory,
    ComplaintSource,
    Role,
    UserStatus,
)
from app.services import complaints as complaints_svc


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
REV_L25 = "f0a1b2c3d4e5"
REV_L12 = "e8f9a0b1c2d3"
DOWNGRADE_BLOCKED_SNIPPET = "Cannot downgrade L-25 while external complaints"


def _alembic_cfg(database_url: str) -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", database_url)
    return cfg


def _current_revision(engine) -> str | None:
    with engine.connect() as conn:
        return conn.execute(text("SELECT version_num FROM alembic_version")).scalar()


@pytest.fixture
def local_db_url() -> str:
    import os

    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url or ("127.0.0.1" not in url and "localhost" not in url):
        pytest.skip("Requires local DATABASE_URL (127.0.0.1/localhost)")
    return url


def test_downgrade_blocked_when_external_complaint_without_user(
    local_db_url: str,
) -> None:
    """upgrade → external row → downgrade must fail explicitly; data intact."""
    cfg = _alembic_cfg(local_db_url)
    engine = create_engine(local_db_url)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    command.upgrade(cfg, REV_L25)
    assert _current_revision(engine) == REV_L25

    db: Session = SessionLocal()
    created_id: uuid.UUID | None = None
    try:
        # Isolate: remove any prior null-user rows so the probe is the blocker.
        db.execute(
            text(
                "DELETE FROM complaint_history WHERE complaint_id IN "
                "(SELECT id FROM complaints WHERE complainant_user_id IS NULL)"
            )
        )
        db.execute(text("DELETE FROM complaints WHERE complainant_user_id IS NULL"))
        db.commit()

        admin = User(
            role=Role.admin,
            name=f"MigAdm {uuid.uuid4().hex[:6]}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        complaint = complaints_svc.create_external_complaint(
            db,
            admin_user_id=str(admin.id),
            source=ComplaintSource.livro_reclamacoes,
            category=ComplaintCategory.other,
            description="Downgrade guard probe — do not delete for assertion.",
            submitted_at=datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc),
            external_reference=f"LRE-GUARD-{uuid.uuid4().hex[:8].upper()}",
            complainant_name="Guard Probe",
        )
        created_id = complaint.id
        assert complaint.complainant_user_id is None

        with pytest.raises(Exception) as exc_info:
            command.downgrade(cfg, REV_L12)
        assert DOWNGRADE_BLOCKED_SNIPPET in str(exc_info.value)

        assert _current_revision(engine) == REV_L25

        db.expire_all()
        still = db.execute(
            select(Complaint).where(Complaint.id == created_id)
        ).scalar_one_or_none()
        assert still is not None
        assert still.complainant_user_id is None
        assert still.description.startswith("Downgrade guard probe")
        hist = db.execute(
            select(ComplaintHistory).where(ComplaintHistory.complaint_id == created_id)
        ).scalars().all()
        assert hist
    finally:
        if created_id is not None:
            db.execute(
                text("DELETE FROM complaint_history WHERE complaint_id = :id"),
                {"id": str(created_id)},
            )
            db.execute(
                text("DELETE FROM complaints WHERE id = :id"),
                {"id": str(created_id)},
            )
            db.commit()
        db.close()

    # Clean path: downgrade/upgrade still works with no null-user rows
    command.downgrade(cfg, REV_L12)
    assert _current_revision(engine) == REV_L12
    command.upgrade(cfg, REV_L25)
    assert _current_revision(engine) == REV_L25
