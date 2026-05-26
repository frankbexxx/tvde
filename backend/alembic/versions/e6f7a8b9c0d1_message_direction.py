"""Inbox bidirectional — message direction + partner reads.

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e6f7a8b9c0d1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "partner_messages",
        sa.Column(
            "direction",
            sa.String(16),
            nullable=False,
            server_default="to_driver",
        ),
    )
    op.create_index("ix_partner_messages_direction", "partner_messages", ["direction"])

    op.create_table(
        "partner_message_reads",
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("partner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "read_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("message_id", "partner_user_id", name="pk_partner_message_reads"),
    )


def downgrade() -> None:
    op.drop_table("partner_message_reads")
    op.drop_index("ix_partner_messages_direction", table_name="partner_messages")
    op.drop_column("partner_messages", "direction")
