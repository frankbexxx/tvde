"""L-25 external complaint fields + partial unique external_reference.

Revision ID: f0a1b2c3d4e5
Revises: e8f9a0b1c2d3
Create Date: 2026-09-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f0a1b2c3d4e5"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None

DOWNGRADE_BLOCKED_MSG = (
    "Cannot downgrade L-25 while external complaints without "
    "complainant_user_id exist."
)


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("external_reference", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("external_response_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("external_responded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("complainant_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("complainant_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("complainant_phone", sa.String(length=32), nullable=True),
    )
    op.alter_column(
        "complaints",
        "complainant_user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.create_index(
        "uq_complaints_source_external_reference",
        "complaints",
        ["source", "external_reference"],
        unique=True,
        postgresql_where=sa.text("external_reference IS NOT NULL"),
    )


def downgrade() -> None:
    conn = op.get_bind()
    null_user_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM complaints WHERE complainant_user_id IS NULL")
    ).scalar()
    if null_user_count:
        raise RuntimeError(DOWNGRADE_BLOCKED_MSG)

    op.drop_index(
        "uq_complaints_source_external_reference",
        table_name="complaints",
    )
    op.alter_column(
        "complaints",
        "complainant_user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_column("complaints", "complainant_phone")
    op.drop_column("complaints", "complainant_email")
    op.drop_column("complaints", "complainant_name")
    op.drop_column("complaints", "external_responded_at")
    op.drop_column("complaints", "external_response_due_at")
    op.drop_column("complaints", "external_reference")
