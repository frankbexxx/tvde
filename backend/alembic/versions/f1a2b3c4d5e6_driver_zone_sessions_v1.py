"""Driver zone day budget + zone sessions (v1 skeleton).

Revision ID: f1a2b3c4d5e6
Revises: d4e5f6a7b8c9
Create Date: 2026-05-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "driver_zone_day_budgets",
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("used_changes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_changes_count", sa.Integer(), nullable=False, server_default="2"),
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default="Europe/Lisbon",
        ),
        sa.PrimaryKeyConstraint("driver_id", "service_date", name="pk_driver_zone_day_budgets"),
    )
    op.create_table(
        "driver_zone_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("zone_id", sa.String(length=128), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eta_seconds_baseline", sa.Integer(), nullable=False),
        sa.Column("eta_margin_percent", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "first_completed_trip_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trips.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("first_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consume_reason", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("cancel_reason", sa.Text(), nullable=True),
        sa.Column("extension_requested", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("extension_reason", sa.Text(), nullable=True),
        sa.Column("extension_seconds_approved", sa.Integer(), nullable=True),
        sa.Column(
            "approved_by_partner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_driver_zone_sessions"),
    )
    op.create_index(
        "ix_driver_zone_sessions_driver_status",
        "driver_zone_sessions",
        ["driver_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_driver_zone_sessions_deadline_at",
        "driver_zone_sessions",
        ["deadline_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_driver_zone_sessions_deadline_at", table_name="driver_zone_sessions")
    op.drop_index("ix_driver_zone_sessions_driver_status", table_name="driver_zone_sessions")
    op.drop_table("driver_zone_sessions")
    op.drop_table("driver_zone_day_budgets")
