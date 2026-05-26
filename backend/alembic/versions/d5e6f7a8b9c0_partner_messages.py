"""Partner → driver inbox messages.

Revision ID: d5e6f7a8b9c0
Revises: c0f1e2d3b4a5
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d5e6f7a8b9c0"
down_revision = "c0f1e2d3b4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "partner_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("driver_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(16), nullable=False, server_default="normal"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_partner_messages_partner", "partner_messages", ["partner_id"])
    op.create_index("ix_partner_messages_driver", "partner_messages", ["driver_user_id"])

    op.create_table(
        "driver_message_reads",
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("driver_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "read_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("message_id", "driver_user_id", name="pk_driver_message_reads"),
    )


def downgrade() -> None:
    op.drop_table("driver_message_reads")
    op.drop_index("ix_partner_messages_driver", table_name="partner_messages")
    op.drop_index("ix_partner_messages_partner", table_name="partner_messages")
    op.drop_table("partner_messages")
