"""Add payments.refunded_amount (STRIPE-LIVE-02 F1).

Revision ID: a0b1c2d3e4f6
Revises: f9a0b1c2d3e4
Create Date: 2026-10-20

Orthogonal to payment_status_enum — no new PaymentStatus values.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a0b1c2d3e4f6"
down_revision = "f9a0b1c2d3e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column(
            "refunded_amount",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
            comment="Cumulative Stripe refund total (EUR); max with webhook charge.refunded.",
        ),
    )


def downgrade() -> None:
    op.drop_column("payments", "refunded_amount")
