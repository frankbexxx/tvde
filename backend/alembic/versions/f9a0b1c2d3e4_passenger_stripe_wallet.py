"""users.stripe_customer_id + passenger_payment_methods + payments.stripe_payment_method_id

Revision ID: f9a0b1c2d3e4
Revises: c4d5e6f7a8b9
Create Date: 2026-10-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f9a0b1c2d3e4"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "stripe_customer_id",
            sa.String(length=128),
            nullable=True,
            comment="Stripe Customer id (cus_…); lazy-created for passenger wallet.",
        ),
    )
    op.create_index(
        "ix_users_stripe_customer_id",
        "users",
        ["stripe_customer_id"],
        unique=True,
    )

    op.create_table(
        "passenger_payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stripe_payment_method_id", sa.String(length=128), nullable=False),
        sa.Column("brand", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("last4", sa.String(length=4), nullable=False, server_default=""),
        sa.Column("exp_month", sa.Integer(), nullable=True),
        sa.Column("exp_year", sa.Integer(), nullable=True),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
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
        sa.UniqueConstraint(
            "stripe_payment_method_id",
            name="uq_passenger_payment_methods_stripe_pm",
        ),
    )
    op.create_index(
        "ix_passenger_payment_methods_user_id",
        "passenger_payment_methods",
        ["user_id"],
    )
    op.create_index(
        "ix_passenger_payment_methods_user_default",
        "passenger_payment_methods",
        ["user_id", "is_default"],
    )

    op.add_column(
        "payments",
        sa.Column(
            "stripe_payment_method_id",
            sa.String(length=128),
            nullable=True,
            comment="PaymentMethod attached at accept (for detach guards).",
        ),
    )


def downgrade() -> None:
    op.drop_column("payments", "stripe_payment_method_id")
    op.drop_index(
        "ix_passenger_payment_methods_user_default",
        table_name="passenger_payment_methods",
    )
    op.drop_index(
        "ix_passenger_payment_methods_user_id",
        table_name="passenger_payment_methods",
    )
    op.drop_table("passenger_payment_methods")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "stripe_customer_id")
