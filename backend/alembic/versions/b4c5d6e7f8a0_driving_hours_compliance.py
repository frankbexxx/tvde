"""driving hours: segments + driving_rest_until (B4 EXTRA)

Revision ID: b4c5d6e7f8a0
Revises: a1b2c3d4e5f6
Create Date: 2026-05-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b4c5d6e7f8a0"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "drivers",
        sa.Column(
            "driving_rest_until",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="UTC: não aceitar novas viagens até este instante (repouso após limite diário).",
        ),
    )
    op.create_table(
        "driver_active_driving_segments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("drivers.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "trip_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trips.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_driver_active_driving_segments_driver_id",
        "driver_active_driving_segments",
        ["driver_id"],
    )
    op.create_index(
        "ix_driver_active_driving_segments_trip_id",
        "driver_active_driving_segments",
        ["trip_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_driver_active_driving_segments_trip_id",
        table_name="driver_active_driving_segments",
    )
    op.drop_index(
        "ix_driver_active_driving_segments_driver_id",
        table_name="driver_active_driving_segments",
    )
    op.drop_table("driver_active_driving_segments")
    op.drop_column("drivers", "driving_rest_until")
