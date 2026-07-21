"""vehicle_documents — PARTNER-FLEET-3A

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b9c0d1e2f3a4"
down_revision = "a8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vehicle_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_type", sa.String(64), nullable=False),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default="pending_review",
        ),
        sa.Column("file_path", sa.String(512), nullable=True),
        sa.Column("file_name", sa.String(256), nullable=True),
        sa.Column("document_number", sa.String(120), nullable=True),
        sa.Column("issuer", sa.String(200), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
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
            ["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["partner_id"], ["partners.id"], ondelete="RESTRICT"
        ),
        sa.UniqueConstraint(
            "vehicle_id",
            "document_type",
            name="uq_vehicle_documents_vehicle_type",
        ),
    )
    op.create_index(
        "ix_vehicle_documents_partner_id", "vehicle_documents", ["partner_id"]
    )
    op.create_index(
        "ix_vehicle_documents_vehicle_id", "vehicle_documents", ["vehicle_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_vehicle_documents_vehicle_id", table_name="vehicle_documents")
    op.drop_index("ix_vehicle_documents_partner_id", table_name="vehicle_documents")
    op.drop_table("vehicle_documents")
