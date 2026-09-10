"""PET-5A.2 — structured cancellation / offer rejection reason codes.

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-09-10

Backward compatible: all new columns nullable. No history rewrite.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d2e3f4a5b6c7"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "cancellation_reason_code",
            sa.String(length=64),
            nullable=True,
            comment="Structured attendable/cancel reason code (PET-5A.2).",
        ),
    )
    op.add_column(
        "trip_offers",
        sa.Column(
            "rejection_reason_code",
            sa.String(length=64),
            nullable=True,
            comment="Structured attendable reject reason (PET-5A.2).",
        ),
    )
    op.add_column(
        "trip_offers",
        sa.Column(
            "rejection_reason_detail",
            sa.String(length=280),
            nullable=True,
            comment="Optional/required free text for other_attendable_reason.",
        ),
    )


def downgrade() -> None:
    op.drop_column("trip_offers", "rejection_reason_detail")
    op.drop_column("trip_offers", "rejection_reason_code")
    op.drop_column("trips", "cancellation_reason_code")
