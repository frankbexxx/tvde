"""User legal acceptances (M2.11).

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-09-25

Additive table. No backfill. Existing accounts have no row until they accept.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e7f8a9b0c1d2"
down_revision = "d6e7f8a9b0c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_legal_acceptances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("terms_version", sa.String(length=64), nullable=False),
        sa.Column("privacy_version", sa.String(length=64), nullable=False),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_user_legal_acceptances_user_accepted",
        "user_legal_acceptances",
        ["user_id", "accepted_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_legal_acceptances_user_accepted",
        table_name="user_legal_acceptances",
    )
    op.drop_table("user_legal_acceptances")
