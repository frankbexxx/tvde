"""PARTNER-FLEET-2A: vehicles table + drivers.active_vehicle_id

Revision ID: f6a7b8c9d0e1
Revises: b5c6d7e8f9a0
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f6a7b8c9d0e1"
down_revision = "b5c6d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plate", sa.String(32), nullable=False),
        sa.Column("plate_normalized", sa.String(32), nullable=False),
        sa.Column("make", sa.String(80), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("color", sa.String(40), nullable=True),
        sa.Column(
            "service_category",
            sa.String(24),
            nullable=False,
            server_default="x",
        ),
        sa.Column(
            "status",
            sa.String(24),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["partner_id"],
            ["partners.id"],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("plate_normalized", name="uq_vehicles_plate_normalized"),
    )
    op.create_index("ix_vehicles_partner_id", "vehicles", ["partner_id"])

    op.add_column(
        "drivers",
        sa.Column(
            "active_vehicle_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_drivers_active_vehicle_id",
        "drivers",
        "vehicles",
        ["active_vehicle_id"],
        ["id"],
        ondelete="SET NULL",
    )
    # Postgres UNIQUE allows multiple NULLs — enforces 1 vehicle → at most 1 driver.
    op.create_index(
        "uq_drivers_active_vehicle_id",
        "drivers",
        ["active_vehicle_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_drivers_active_vehicle_id", table_name="drivers")
    op.drop_constraint("fk_drivers_active_vehicle_id", "drivers", type_="foreignkey")
    op.drop_column("drivers", "active_vehicle_id")
    op.drop_index("ix_vehicles_partner_id", table_name="vehicles")
    op.drop_table("vehicles")
