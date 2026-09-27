"""device_push_tokens for FCM registration.

Revision ID: a2b3c4d5e6f7
Revises: e7f8a9b0c1d2
Create Date: 2026-09-27

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a2b3c4d5e6f7"
down_revision = "e7f8a9b0c1d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_push_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False),
        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token", name="uq_device_push_tokens_token"),
    )
    op.create_index(
        "ix_device_push_tokens_user_id",
        "device_push_tokens",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_device_push_tokens_user_id", table_name="device_push_tokens")
    op.drop_table("device_push_tokens")
