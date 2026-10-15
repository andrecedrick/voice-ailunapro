"""Subscription billing for Voice AiLunaPro.

Dormant unless STRIPE_SECRET_KEY is set: `is_enabled()` guards every entry
point, so a deployment without it keeps the upstream behaviour.
"""

from api.services.billing.plans import Plan, list_plans, plan_by_id
from api.services.billing.stripe_billing import (
    BillingDecision,
    check_organization_can_call,
    create_checkout_session,
    create_portal_session,
    handle_stripe_event,
    is_enabled,
    report_run_minutes,
    stripe_error_message,
    verify_webhook_signature,
)

__all__ = [
    "Plan",
    "list_plans",
    "plan_by_id",
    "BillingDecision",
    "check_organization_can_call",
    "create_checkout_session",
    "create_portal_session",
    "handle_stripe_event",
    "is_enabled",
    "report_run_minutes",
    "stripe_error_message",
    "verify_webhook_signature",
]
