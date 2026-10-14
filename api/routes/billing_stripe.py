"""Subscription endpoints backed by Stripe.

Three authenticated routes for the workspace (status, checkout, portal) and one
public webhook. The webhook is unauthenticated by necessity and is protected by
the Stripe signature instead; it reads the raw body because the signature is
computed over the exact bytes Stripe sent.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger
from pydantic import BaseModel

from api.constants import STRIPE_TRIAL_MINUTE_CAP, UI_APP_URL
from api.db import db_client
from api.db.models import UserModel
from api.services.auth.depends import get_user_with_selected_organization
from api.services.billing import (
    create_checkout_session,
    create_portal_session,
    handle_stripe_event,
    is_enabled,
    verify_webhook_signature,
)

router = APIRouter(prefix="/billing/stripe", tags=["billing"])


class CheckoutRequest(BaseModel):
    price_id: str


class CheckoutResponse(BaseModel):
    url: str


class SubscriptionStatusResponse(BaseModel):
    billing_enabled: bool
    subscribed: bool
    status: str | None = None
    plan_name: str | None = None
    included_minutes: int = 0
    trial_minutes_used: float = 0.0
    trial_minutes_cap: int = STRIPE_TRIAL_MINUTE_CAP
    trial_ends_at: str | None = None
    current_period_end: str | None = None


def _require_billing() -> None:
    if not is_enabled():
        raise HTTPException(
            status_code=404, detail="Subscription billing is not configured"
        )


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    user: UserModel = Depends(get_user_with_selected_organization),
) -> SubscriptionStatusResponse:
    """Report the workspace's subscription as the billing page shows it."""
    if not is_enabled():
        return SubscriptionStatusResponse(billing_enabled=False, subscribed=False)

    billing = await db_client.get_billing(user.selected_organization_id)
    if billing is None:
        return SubscriptionStatusResponse(billing_enabled=True, subscribed=False)

    return SubscriptionStatusResponse(
        billing_enabled=True,
        subscribed=bool(billing.stripe_subscription_id),
        status=billing.status,
        plan_name=billing.plan_name,
        included_minutes=billing.included_minutes or 0,
        trial_minutes_used=float(billing.trial_minutes_used or 0.0),
        trial_ends_at=billing.trial_ends_at.isoformat()
        if billing.trial_ends_at
        else None,
        current_period_end=billing.current_period_end.isoformat()
        if billing.current_period_end
        else None,
    )


@router.post("/checkout-session", response_model=CheckoutResponse)
async def start_checkout(
    payload: CheckoutRequest,
    user: UserModel = Depends(get_user_with_selected_organization),
) -> CheckoutResponse:
    """Open Stripe Checkout for the selected plan."""
    _require_billing()

    organization_id = user.selected_organization_id
    billing = await db_client.get_billing(organization_id)

    base = UI_APP_URL.rstrip("/")
    try:
        url = await create_checkout_session(
            organization_id=organization_id,
            price_id=payload.price_id,
            success_url=f"{base}/billing?checkout=success",
            cancel_url=f"{base}/billing?checkout=cancelled",
            customer_email=getattr(user, "email", None),
            existing_customer_id=billing.stripe_customer_id if billing else None,
        )
    except Exception as e:
        logger.error(
            "Could not open checkout for org {}: {}",
            organization_id,
            e,
        )
        raise HTTPException(
            status_code=502, detail="Could not reach Stripe. Please try again."
        )

    return CheckoutResponse(url=url)


@router.post("/portal", response_model=CheckoutResponse)
async def open_customer_portal(
    user: UserModel = Depends(get_user_with_selected_organization),
) -> CheckoutResponse:
    """Open the Stripe customer portal to change plan, card or cancel."""
    _require_billing()

    billing = await db_client.get_billing(user.selected_organization_id)
    if billing is None or not billing.stripe_customer_id:
        raise HTTPException(
            status_code=404, detail="This workspace has no billing account yet"
        )

    try:
        url = await create_portal_session(
            customer_id=billing.stripe_customer_id,
            return_url=f"{UI_APP_URL.rstrip('/')}/billing",
        )
    except Exception as e:
        logger.error(
            "Could not open the customer portal for org {}: {}",
            user.selected_organization_id,
            e,
        )
        raise HTTPException(
            status_code=502, detail="Could not reach Stripe. Please try again."
        )

    return CheckoutResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Receive Stripe events.

    Returns 200 even when applying the event fails, so Stripe does not retry an
    event this deployment will never apply; the failure is logged instead. A bad
    signature is a 400 and is never applied.
    """
    if not is_enabled():
        raise HTTPException(status_code=404, detail="Not found")

    raw_body = await request.body()
    signature = request.headers.get("stripe-signature", "")

    if not verify_webhook_signature(raw_body, signature):
        logger.warning("Rejected a Stripe webhook with an invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Malformed payload")

    try:
        await handle_stripe_event(event)
    except Exception as e:
        logger.error("Could not apply Stripe event {}: {}", event.get("id"), e)

    return {"received": True}
