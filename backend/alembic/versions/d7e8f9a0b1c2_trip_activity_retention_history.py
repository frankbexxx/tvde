"""Add trip historical partner/vehicle for M2 activity retention.

Revision ID: d7e8f9a0b1c2
Revises: c2d3e4f5a6b7
Create Date: 2026-09-05

Preserves partner/operator + vehicle (+ plate snapshot) at trip assignment time
so later driver reassignment / vehicle plate changes do not rewrite history.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d7e8f9a0b1c2"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="Partner/operator at assignment (historical; M2 activity retention).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="Vehicle at assignment (historical; M2 activity retention).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "vehicle_plate",
            sa.String(32),
            nullable=True,
            comment="Plate snapshot at assignment (survives later plate edits).",
        ),
    )
    op.create_foreign_key(
        "fk_trips_partner_id_partners",
        "trips",
        "partners",
        ["partner_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_trips_vehicle_id_vehicles",
        "trips",
        "vehicles",
        ["vehicle_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_trips_partner_id", "trips", ["partner_id"])
    op.create_index("ix_trips_vehicle_id", "trips", ["vehicle_id"])

    # Best-effort backfill from *current* driver state only (may be incomplete
    # for reassigned drivers). Leave null when driver_id is null.
    op.execute(
        sa.text(
            """
            UPDATE trips AS t
            SET
              partner_id = d.partner_id,
              vehicle_id = d.active_vehicle_id,
              vehicle_plate = v.plate
            FROM drivers AS d
            LEFT JOIN vehicles AS v ON v.id = d.active_vehicle_id
            WHERE t.driver_id = d.user_id
              AND t.partner_id IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_trips_vehicle_id", table_name="trips")
    op.drop_index("ix_trips_partner_id", table_name="trips")
    op.drop_constraint("fk_trips_vehicle_id_vehicles", "trips", type_="foreignkey")
    op.drop_constraint("fk_trips_partner_id_partners", "trips", type_="foreignkey")
    op.drop_column("trips", "vehicle_plate")
    op.drop_column("trips", "vehicle_id")
    op.drop_column("trips", "partner_id")
