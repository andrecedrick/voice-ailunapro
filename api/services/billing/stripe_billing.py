"""Stripe subscription billing for Voice AiLunaPro.

Three jobs:

* decide whether an organization may start a call (`check_organization_can_call`)
* report the minutes a finished call consumed (`report_run_minutes`)
* keep the local subscription mirror current from Stripe webhooks
  (`handle_stripe_event`)

Quota itself lives in Stripe: each plan price is a graduated metered price whose
first tier is free up to the included minutes, so every minute is reported and
Stripe bills only the overage. The only quota enforced here is the trial cap,
because a trial has no invoice to absorb a runaway loop.

Calls go over httpx against the REST API rather than through the `stripe`
package: the repo already depends on httpx, the surface used here is four
endpoints, and webhook signatures are a plain HMAC.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Mapping

import httpx
from loguru import logger

from api.constants import (
    BILLING_EXEMPT_ORG_IDS,
    STRIPE_API_BASE,
    STRIPE_METER_EVENT_NAME,
    STRIPE_SECRET_KEY,
    STRIPE_TRIAL_MINUTE_CAP,
    STRIPE_WEBHOOK_SECRET,
)
from api.db import db_client
from api.db.organization_billing_client import BILLABLE_STATUSES

_TIMEOUT = httpx.Timeout(15.0)

# Tolerance on the webhook timestamp, matching Stripe's own default.
_SIGNATURE_TOLERANCE_SECONDS = 300


@dataclass
class BillingDecision:
    """Outcome of the pre-call billing check."""

    allowed: bool
    error_code: str = ""
    error_message: str = ""


def is_enabled() -> bool:
    """True when this deployment bills through Stripe."""
    return bool(STRIPE_SECRET_KEY)


def _headers(idempotency_key: str | None = None) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {STRIPE_SECRET_KEY}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    return headers


async def _post(
    path: str, data: Mapping[str, Any], *, idempotency_key: str | None = None
) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            f"{STRIPE_API_BASE}{path}",
            data=data,
            headers=_headers(idempotency_key),
        )
    response.raise_for_status()
    return response.json()


async def _get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(f"{STRIPE_API_BASE}{path}", headers=_headers())
    response.raise_for_status()
    return response.json()


# --------------------------------------------------------------------------
# Pre-call gate
# --------------------------------------------------------------------------


async def check_organization_can_call(organization_id: int) -> BillingDecision:
    """Decide whether an organization may start a billable run.

    With signup open, a workspace that never reached checkout is a stranger,
    not the operator: once billing is configured it is refused unless it is
    listed in BILLING_EXEMPT_ORG_IDS. A read failure still allows the call —
    refusing live traffic because the billing table is briefly unreachable
    costs a paying customer more than one unbilled call.
    """
    if not is_enabled():
        return BillingDecision(allowed=True)

    if organization_id in BILLING_EXEMPT_ORG_IDS:
        return BillingDecision(allowed=True)

    try:
        billing = await db_client.get_billing(organization_id)
    except Exception as e:
        logger.error(
            "Billing check could not read billing state for org {}: {}",
            organization_id,
            e,
        )
        return BillingDecision(allowed=True)

    if billing is None:
        return BillingDecision(
            allowed=False,
            error_code="subscription_required",
            error_message=(
                "This workspace has no Voice AiLunaPro plan yet. "
                "Start a plan to place calls."
            ),
        )

    status = (billing.status or "").lower()
    if status not in BILLABLE_STATUSES:
        return BillingDecision(
            allowed=False,
            error_code="subscription_inactive",
            error_message=(
                "This workspace has no active Voice AiLunaPro subscription. "
                "Start or renew a plan to place calls."
            ),
        )

    if status == "trialing":
        used = float(billing.trial_minutes_used or 0.0)
        if used >= STRIPE_TRIAL_MINUTE_CAP:
            return BillingDecision(
                allowed=False,
                error_code="trial_minutes_exhausted",
                error_message=(
                    f"The free trial covers {STRIPE_TRIAL_MINUTE_CAP} minutes and "
                    "they have all been used. Upgrade to keep calling."
                ),
            )

    return BillingDecision(allowed=True)


# --------------------------------------------------------------------------
# Usage reporting
# --------------------------------------------------------------------------


async def report_run_minutes(
    *, organization_id: int, duration_seconds: float, workflow_run_id: int
) -> None:
    """Report one finished run's minutes to the Stripe billing meter.

    A started minute is a billed minute, which is what the published pricing
    says. Never raises: a failed usage report must not fail the completion job.
    """
    if not is_enabled() or duration_seconds <= 0:
        return

    try:
        billing = await db_client.get_billing(organization_id)
    except Exception as e:
        logger.error(
            "Usage report skipped for run {}: cannot read billing state: {}",
            workflow_run_id,
            e,
        )
        return

    if billing is None or not billing.stripe_customer_id:
        logger.info(
            "Usage report skipped for run {}: org {} has no Stripe customer",
            workflow_run_id,
            organization_id,
        )
        return

    minutes = -(-int(duration_seconds) // 60)  # ceil, started minute is billed

    if (billing.status or "").lower() == "trialing":
        try:
            await db_client.add_trial_minutes(organization_id, float(minutes))
        except Exception as e:
            logger.error(
                "Could not record trial minutes for run {}: {}", workflow_run_id, e
            )

    try:
        await _post(
            "/v1/billing/meter_events",
            {
                "event_name": STRIPE_METER_EVENT_NAME,
                "timestamp": int(time.time()),
                "payload[stripe_customer_id]": billing.stripe_customer_id,
                "payload[value]": str(minutes),
            },
            # Stripe de-duplicates on this key, so a retried completion job
            # cannot bill the same call twice.
            idempotency_key=f"voice-run-{workflow_run_id}",
        )
        logger.info(
            "Reported {} minute(s) for run {} to Stripe", minutes, workflow_run_id
        )
    except httpx.HTTPStatusError as e:
        logger.error(
            "Stripe rejected the usage report for run {}: {} {}",
            workflow_run_id,
            e.response.status_code,
            e.response.text[:300],
        )
    except Exception as e:
        logger.error("Could not report usage for run {}: {}", workflow_run_id, e)


# --------------------------------------------------------------------------
# Checkout and customer portal
# --------------------------------------------------------------------------


async def create_checkout_session(
    *,
    organization_id: int,
    price_id: str,
    success_url: str,
    cancel_url: str,
    customer_email: str | None = None,
    existing_customer_id: str | None = None,
) -> str:
    """Open a Stripe Checkout session and return its URL.

    The organization id travels as both client_reference_id and session
    metadata, which is what lets the webhook bind the resulting subscription to
    the right workspace.
    """
    data: dict[str, Any] = {
        "mode": "subscription",
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": str(organization_id),
        "metadata[organization_id]": str(organization_id),
        "subscription_data[metadata][organization_id]": str(organization_id),
        "allow_promotion_codes": "true",
    }
    if existing_customer_id:
        data["customer"] = existing_customer_id
    elif customer_email:
        data["customer_email"] = customer_email

    session = await _post("/v1/checkout/sessions", data)
    return session["url"]


async def create_portal_session(*, customer_id: str, return_url: str) -> str:
    """Open a Stripe customer portal session and return its URL."""
    session = await _post(
        "/v1/billing_portal/sessions",
        {"customer": customer_id, "return_url": return_url},
    )
    return session["url"]


# --------------------------------------------------------------------------
# Webhooks
# --------------------------------------------------------------------------


def verify_webhook_signature(payload: bytes, signature_header: str) -> bool:
    """Verify a Stripe-Signature header against the raw request body."""
    if not STRIPE_WEBHOOK_SECRET or not signature_header:
        return False

    timestamp = ""
    signatures: list[str] = []
    for part in signature_header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)

    if not timestamp or not signatures:
        return False

    try:
        age = abs(time.time() - int(timestamp))
    except ValueError:
        return False
    if age > _SIGNATURE_TOLERANCE_SECONDS:
        logger.warning("Rejected a Stripe webhook that is {:.0f}s old", age)
        return False

    expected = hmac.new(
        STRIPE_WEBHOOK_SECRET.encode(),
        f"{timestamp}.".encode() + payload,
        hashlib.sha256,
    ).hexdigest()

    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)


def _as_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value), UTC)
    except (TypeError, ValueError, OSError):
        return None


async def _included_minutes_for_subscription(subscription: Mapping[str, Any]) -> int:
    """Read included minutes from the subscription's price metadata.

    Each plan price carries `metadata[included_minutes]`; an unlabelled price
    reports 0, which only affects what the customer is shown.
    """
    items = (subscription.get("items") or {}).get("data") or []
    for item in items:
        price = item.get("price") or {}
        metadata = price.get("metadata") or {}
        raw = metadata.get("included_minutes")
        if raw:
            try:
                return int(raw)
            except (TypeError, ValueError):
                continue
    return 0


def _plan_name_for_subscription(subscription: Mapping[str, Any]) -> str | None:
    items = (subscription.get("items") or {}).get("data") or []
    for item in items:
        price = item.get("price") or {}
        nickname = price.get("nickname")
        if nickname:
            return nickname
        product = price.get("product")
        if isinstance(product, str):
            return product
    return None


async def _organization_id_for_subscription(
    subscription: Mapping[str, Any],
) -> int | None:
    """Resolve the workspace a subscription belongs to.

    Prefers the metadata written at checkout; falls back to the customer id
    already stored locally, which covers subscriptions edited in the Stripe
    dashboard after the fact.
    """
    metadata = subscription.get("metadata") or {}
    raw = metadata.get("organization_id")
    if raw:
        try:
            return int(raw)
        except (TypeError, ValueError):
            pass

    customer_id = subscription.get("customer")
    if isinstance(customer_id, str):
        existing = await db_client.get_billing_by_customer(customer_id)
        if existing is not None:
            return existing.organization_id

    return None


async def _apply_subscription(subscription: Mapping[str, Any]) -> None:
    organization_id = await _organization_id_for_subscription(subscription)
    if organization_id is None:
        logger.warning(
            "Stripe subscription {} carries no organization: not applied",
            subscription.get("id"),
        )
        return

    status = subscription.get("status")
    fields: dict[str, Any] = {
        "stripe_subscription_id": subscription.get("id"),
        "status": status,
        "plan_name": _plan_name_for_subscription(subscription),
        "included_minutes": await _included_minutes_for_subscription(subscription),
        "trial_ends_at": _as_datetime(subscription.get("trial_end")),
        "current_period_end": _as_datetime(subscription.get("current_period_end")),
        "last_event_at": datetime.now(UTC),
    }
    customer_id = subscription.get("customer")
    if isinstance(customer_id, str):
        fields["stripe_customer_id"] = customer_id

    # Leaving the trial resets its counter, so a later trial on the same
    # workspace starts from zero instead of inheriting the old total.
    if status and status != "trialing":
        fields["trial_minutes_used"] = 0.0

    await db_client.upsert_billing(organization_id, **fields)
    logger.info(
        "Applied Stripe subscription {} to org {} (status {})",
        subscription.get("id"),
        organization_id,
        status,
    )


async def _apply_checkout_session(session: Mapping[str, Any]) -> None:
    raw_org = (session.get("metadata") or {}).get(
        "organization_id"
    ) or session.get("client_reference_id")
    try:
        organization_id = int(raw_org) if raw_org is not None else None
    except (TypeError, ValueError):
        organization_id = None

    if organization_id is None:
        logger.warning(
            "Checkout session {} carries no organization: not applied",
            session.get("id"),
        )
        return

    customer_id = session.get("customer")
    fields: dict[str, Any] = {"last_event_at": datetime.now(UTC)}
    if isinstance(customer_id, str):
        fields["stripe_customer_id"] = customer_id

    await db_client.upsert_billing(organization_id, **fields)

    # The session payload carries only the subscription id, so fetch the
    # subscription itself for status, trial end and included minutes.
    subscription_id = session.get("subscription")
    if isinstance(subscription_id, str):
        try:
            subscription = await _get(
                f"/v1/subscriptions/{subscription_id}?expand[]=items.data.price"
            )
        except Exception as e:
            logger.error("Could not load subscription {}: {}", subscription_id, e)
            return
        subscription.setdefault("metadata", {})["organization_id"] = str(
            organization_id
        )
        await _apply_subscription(subscription)


async def handle_stripe_event(event: Mapping[str, Any]) -> None:
    """Apply one verified Stripe event to the local subscription mirror."""
    event_type = event.get("type") or ""
    obj = ((event.get("data") or {}).get("object")) or {}

    if event_type == "checkout.session.completed":
        await _apply_checkout_session(obj)
    elif event_type.startswith("customer.subscription."):
        await _apply_subscription(obj)
    elif event_type in {"invoice.paid", "invoice.payment_failed"}:
        customer_id = obj.get("customer")
        if not isinstance(customer_id, str):
            return
        existing = await db_client.get_billing_by_customer(customer_id)
        if existing is None:
            return
        status = "active" if event_type == "invoice.paid" else "past_due"
        await db_client.upsert_billing(
            existing.organization_id,
            status=status,
            last_event_at=datetime.now(UTC),
        )
    else:
        logger.debug("Ignoring Stripe event {}", event_type)
