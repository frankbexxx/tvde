"""auth session families and refresh tokens (G2-AUTH-1).

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-10-28

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c8d9e0f1a2b3"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_session_families",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("client_type", sa.String(length=16), nullable=False),
        sa.Column("token_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("absolute_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "client_type IN ('web', 'android')",
            name="ck_auth_session_families_client_type",
        ),
    )
    op.create_index(
        "ix_auth_session_families_user_id",
        "auth_session_families",
        ["user_id"],
    )
    op.create_table(
        "auth_refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idle_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("idempotency_key_hash", sa.String(length=64), nullable=True),
        sa.Column("successor_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("successor_retain_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["family_id"], ["auth_session_families.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_id"], ["auth_refresh_tokens.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_auth_refresh_tokens_token_hash"),
        sa.CheckConstraint(
            "status IN ('active', 'rotated', 'revoked')",
            name="ck_auth_refresh_tokens_status",
        ),
    )
    op.create_index(
        "ix_auth_refresh_tokens_family_id",
        "auth_refresh_tokens",
        ["family_id"],
    )
    op.create_index(
        "uq_auth_refresh_tokens_family_generation",
        "auth_refresh_tokens",
        ["family_id", "generation"],
        unique=True,
    )
    op.create_index(
        "uq_auth_refresh_tokens_one_active",
        "auth_refresh_tokens",
        ["family_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_index(
        "ix_auth_refresh_tokens_successor_retain",
        "auth_refresh_tokens",
        ["successor_retain_until"],
        postgresql_where=sa.text("successor_ciphertext IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_refresh_tokens_successor_retain",
        table_name="auth_refresh_tokens",
    )
    op.drop_index(
        "uq_auth_refresh_tokens_one_active",
        table_name="auth_refresh_tokens",
    )
    op.drop_index(
        "uq_auth_refresh_tokens_family_generation",
        table_name="auth_refresh_tokens",
    )
    op.drop_index("ix_auth_refresh_tokens_family_id", table_name="auth_refresh_tokens")
    op.drop_table("auth_refresh_tokens")
    op.drop_index(
        "ix_auth_session_families_user_id", table_name="auth_session_families"
    )
    op.drop_table("auth_session_families")
