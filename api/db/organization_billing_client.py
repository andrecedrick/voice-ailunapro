from datetime import UTC, datetime
from typing import Any, Optional

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.future import select

from api.db.base_client import BaseDBClient
from api.db.models import OrganizationBillingModel

# Stripe subscription statuses that entitle an organization to place calls.
BILLABLE_STATUSES = frozenset({"trialing", "active", "past_due"})


class OrganizationBillingClient(BaseDBClient):
    async def get_billing(
        self, organization_id: int
    ) -> Optional[OrganizationBillingModel]:
        """Read the billing row for an organization, or None if it has none."""
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationBillingModel).where(
                    OrganizationBillingModel.organization_id == organization_id
                )
            )
            return result.scalars().first()

    async def get_billing_by_customer(
        self, stripe_customer_id: str
    ) -> Optional[OrganizationBillingModel]:
        """Resolve an organization from a Stripe customer id (webhook path)."""
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationBillingModel).where(
                    OrganizationBillingModel.stripe_customer_id == stripe_customer_id
                )
            )
            return result.scalars().first()

    async def upsert_billing(
        self, organization_id: int, **fields: Any
    ) -> OrganizationBillingModel:
        """Create or update the organization's billing row.

        Only the fields passed are written, so a webhook that carries partial
        state (a customer id and nothing else) cannot blank the rest.
        """
        allowed = {
            "stripe_customer_id",
            "stripe_subscription_id",
            "status",
            "plan_name",
            "included_minutes",
            "trial_minutes_used",
            "trial_ends_at",
            "current_period_end",
            "last_event_at",
        }
        values = {k: v for k, v in fields.items() if k in allowed}
        values["updated_at"] = datetime.now(UTC)

        async with self.async_session() as session:
            stmt = (
                insert(OrganizationBillingModel)
                .values(organization_id=organization_id, **values)
                .on_conflict_do_update(
                    index_elements=[OrganizationBillingModel.organization_id],
                    set_=values,
                )
                .returning(OrganizationBillingModel)
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.scalars().first()

    async def add_trial_minutes(
        self, organization_id: int, minutes: float
    ) -> Optional[float]:
        """Add consumed trial minutes and return the new total.

        Returns None when the organization has no billing row. The read and the
        write share one transaction so two calls finishing at once cannot both
        write the same pre-increment value.
        """
        if minutes <= 0:
            return None

        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationBillingModel)
                .where(OrganizationBillingModel.organization_id == organization_id)
                .with_for_update()
            )
            row = result.scalars().first()
            if row is None:
                return None

            row.trial_minutes_used = float(row.trial_minutes_used or 0.0) + minutes
            row.updated_at = datetime.now(UTC)
            total = row.trial_minutes_used
            await session.commit()
            return total
