"""add users.mfa_secret

Revision ID: 20260608_0006
Revises: 20260506_0005
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260608_0006"
down_revision = "20260506_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("mfa_secret", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "mfa_secret")
