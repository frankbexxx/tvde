"""user_identities mirror of email and Google login.

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-29

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b3c4d5e6f7a8"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=16), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("provider_subject", sa.String(length=128), nullable=True),
        sa.Column(
            "is_primary",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_verified",
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
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "provider IN ('email', 'google')",
            name="ck_user_identities_provider",
        ),
        sa.CheckConstraint(
            "("
            "provider = 'google' "
            "AND provider_subject IS NOT NULL "
            "AND btrim(provider_subject) <> ''"
            ") OR ("
            "provider = 'email' "
            "AND email IS NOT NULL "
            "AND btrim(email) <> '' "
            "AND provider_subject IS NULL"
            ")",
            name="ck_user_identities_provider_shape",
        ),
        sa.CheckConstraint(
            "email IS NULL OR ("
            "email = lower(email) AND email = btrim(email) AND email <> ''"
            ")",
            name="ck_user_identities_email_normalized",
        ),
        sa.CheckConstraint(
            "revoked_at IS NULL OR is_primary = false",
            name="ck_user_identities_revoked_not_primary",
        ),
    )
    op.create_index("ix_user_identities_user_id", "user_identities", ["user_id"])
    op.create_index(
        "uq_user_identities_email",
        "user_identities",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )
    op.create_index(
        "uq_user_identities_provider_subject",
        "user_identities",
        ["provider", "provider_subject"],
        unique=True,
        postgresql_where=sa.text("provider_subject IS NOT NULL"),
    )
    op.create_index(
        "uq_user_identities_one_primary",
        "user_identities",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_primary AND revoked_at IS NULL"),
    )
    from app.services.user_identities import backfill_user_identities

    backfill_user_identities(op.get_bind())


def downgrade() -> None:
    op.drop_index("uq_user_identities_one_primary", table_name="user_identities")
    op.drop_index("uq_user_identities_provider_subject", table_name="user_identities")
    op.drop_index("uq_user_identities_email", table_name="user_identities")
    op.drop_index("ix_user_identities_user_id", table_name="user_identities")
    op.drop_table("user_identities")
