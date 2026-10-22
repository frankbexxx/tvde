"""payment_anomalies table (O-PAY PR1).

Revision ID: b7c8d9e0f1a2
Revises: a0b1c2d3e4f6
Create Date: 2026-10-22

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b7c8d9e0f1a2"
down_revision = "a0b1c2d3e4f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_anomalies",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anomaly_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("stripe_event_id", sa.String(length=255), nullable=True),
        sa.Column("payment_intent_id", sa.String(length=128), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("trip_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=128), nullable=True),
        sa.Column(
            "payload_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("environment", sa.String(length=32), nullable=False),
        sa.Column("stripe_mode", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_payment_anomalies_created_at",
        "payment_anomalies",
        [sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_payment_anomalies_type_created_at",
        "payment_anomalies",
        ["anomaly_type", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_payment_anomalies_type_stripe_event_id",
        "payment_anomalies",
        ["anomaly_type", "stripe_event_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_payment_anomalies_type_stripe_event_id",
        "payment_anomalies",
        type_="unique",
    )
    op.drop_index("ix_payment_anomalies_type_created_at", table_name="payment_anomalies")
    op.drop_index("ix_payment_anomalies_created_at", table_name="payment_anomalies")
    op.drop_table("payment_anomalies")
