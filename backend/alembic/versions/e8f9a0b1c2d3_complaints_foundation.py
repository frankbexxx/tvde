"""L-12 complaints foundation + complaint_history procedure trail.

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-09-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e8f9a0b1c2d3"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("public_reference", sa.String(32), nullable=False),
        sa.Column("complainant_role", sa.String(16), nullable=False),
        sa.Column("complainant_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trip_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="in_app"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="received"),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retention_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["complainant_user_id"],
            ["users.id"],
            name="fk_complaints_complainant_user_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trips.id"],
            name="fk_complaints_trip_id_trips",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to"],
            ["users.id"],
            name="fk_complaints_assigned_to_users",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("public_reference", name="uq_complaints_public_reference"),
    )
    op.create_index("ix_complaints_complainant_user_id", "complaints", ["complainant_user_id"])
    op.create_index("ix_complaints_trip_id", "complaints", ["trip_id"])
    op.create_index("ix_complaints_status", "complaints", ["status"])
    op.create_index("ix_complaints_submitted_at", "complaints", ["submitted_at"])
    op.create_index("ix_complaints_retention_until", "complaints", ["retention_until"])
    op.create_index("ix_complaints_public_reference", "complaints", ["public_reference"], unique=True)

    op.create_table(
        "complaint_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("from_status", sa.String(32), nullable=True),
        sa.Column("to_status", sa.String(32), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(
            ["complaint_id"],
            ["complaints.id"],
            name="fk_complaint_history_complaint_id_complaints",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name="fk_complaint_history_actor_user_id_users",
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_complaint_history_complaint_id", "complaint_history", ["complaint_id"])
    op.create_index("ix_complaint_history_occurred_at", "complaint_history", ["occurred_at"])
    op.create_index(
        "ix_complaint_history_complaint_occurred",
        "complaint_history",
        ["complaint_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_complaint_history_complaint_occurred", table_name="complaint_history")
    op.drop_index("ix_complaint_history_occurred_at", table_name="complaint_history")
    op.drop_index("ix_complaint_history_complaint_id", table_name="complaint_history")
    op.drop_table("complaint_history")
    op.drop_index("ix_complaints_public_reference", table_name="complaints")
    op.drop_index("ix_complaints_retention_until", table_name="complaints")
    op.drop_index("ix_complaints_submitted_at", table_name="complaints")
    op.drop_index("ix_complaints_status", table_name="complaints")
    op.drop_index("ix_complaints_trip_id", table_name="complaints")
    op.drop_index("ix_complaints_complainant_user_id", table_name="complaints")
    op.drop_table("complaints")
