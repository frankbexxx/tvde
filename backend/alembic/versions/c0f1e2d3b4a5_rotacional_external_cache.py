"""Rotacional v3: external feed cache table

Revision ID: c0f1e2d3b4a5
Revises: b4c5d6e7f8a0
Create Date: 2026-05-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c0f1e2d3b4a5"
down_revision = "b4c5d6e7f8a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rotacional_external_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("items_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_rotacional_external_cache"),
    )


def downgrade() -> None:
    op.drop_table("rotacional_external_cache")
