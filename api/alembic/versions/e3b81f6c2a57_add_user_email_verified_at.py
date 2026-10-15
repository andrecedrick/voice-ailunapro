"""add users.email_verified_at

Voice AiLunaPro: sign-up now confirms the email address before the first
sign-in. Additive and nullable. Every user that already exists is marked
verified in the same step, so nobody who could sign in yesterday is locked
out today.

Revision ID: e3b81f6c2a57
Revises: d4f7a1c93b62
Create Date: 2026-10-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3b81f6c2a57"
down_revision: Union[str, None] = "d4f7a1c93b62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL")


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
