"""add organization_billing

Revision ID: d4f7a1c93b62
Revises: c82d4f6a9b10
Create Date: 2026-10-14

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4f7a1c93b62"
down_revision: Union[str, None] = "c82d4f6a9b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_billing",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("plan_name", sa.String(), nullable=True),
        sa.Column(
            "included_minutes", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "trial_minutes_used",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
        sa.UniqueConstraint("stripe_customer_id"),
    )
    op.create_index(
        op.f("ix_organization_billing_id"), "organization_billing", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_organization_billing_organization_id"),
        "organization_billing",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_billing_stripe_customer_id"),
        "organization_billing",
        ["stripe_customer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_billing_stripe_subscription_id"),
        "organization_billing",
        ["stripe_subscription_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_billing_status"),
        "organization_billing",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_organization_billing_status"), table_name="organization_billing")
    op.drop_index(
        op.f("ix_organization_billing_stripe_subscription_id"),
        table_name="organization_billing",
    )
    op.drop_index(
        op.f("ix_organization_billing_stripe_customer_id"),
        table_name="organization_billing",
    )
    op.drop_index(
        op.f("ix_organization_billing_organization_id"),
        table_name="organization_billing",
    )
    op.drop_index(op.f("ix_organization_billing_id"), table_name="organization_billing")
    op.drop_table("organization_billing")
