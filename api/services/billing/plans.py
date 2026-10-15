"""The plan catalog, read live from Stripe. Voice AiLunaPro — OURS.

A plan is a Stripe product named "<STRIPE_PLAN_PRODUCT_PREFIX> — <Name>" with
two active prices:

* a licensed monthly price — the subscription fee, and
* a metered graduated price — overage, whose first tier is free up to the
  included minutes.

Nothing is hard-coded: rename, reprice or add a plan in the Stripe dashboard
and the app follows within the cache window. The catalog is also the allowlist
for checkout — the browser picks a plan by product id and the server resolves
the prices, so a client can never check out an arbitrary price on the account.
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from loguru import logger

from api.constants import STRIPE_PLAN_PRODUCT_PREFIX

_CACHE_SECONDS = 600
_cache: tuple[float, list["Plan"]] | None = None


@dataclass(frozen=True)
class Plan:
    id: str  # Stripe product id
    name: str  # display name, prefix stripped ("Starter")
    currency: str
    monthly_amount: int  # minor units (cents)
    interval: str
    included_minutes: int
    overage_per_minute: str | None  # minor units, decimal string ("4.5" = €0.045)
    base_price_id: str
    metered_price_id: str | None

    def public(self) -> dict[str, Any]:
        """What the browser may see: no price ids needed to choose a plan."""
        data = asdict(self)
        data.pop("base_price_id")
        data.pop("metered_price_id")
        return data


def _display_name(product_name: str) -> str:
    rest = product_name[len(STRIPE_PLAN_PRODUCT_PREFIX) :]
    return rest.strip(" —-–:").strip() or product_name


def _included_and_overage(price: dict[str, Any]) -> tuple[int, str | None]:
    tiers = price.get("tiers") or []
    included = 0
    overage: str | None = None
    for tier in tiers:
        raw = tier.get("unit_amount_decimal")
        if raw is None and tier.get("unit_amount") is not None:
            raw = str(tier["unit_amount"])
        try:
            unit = Decimal(raw) if raw is not None else Decimal(0)
        except InvalidOperation:
            unit = Decimal(0)
        flat = tier.get("flat_amount") or 0
        if unit == 0 and flat == 0 and tier.get("up_to"):
            included = int(tier["up_to"])
            continue
        overage = format(unit.normalize(), "f")
        break
    return included, overage


async def _fetch() -> list[Plan]:
    # Imported here to avoid a cycle: stripe_billing imports this module.
    from api.services.billing.stripe_billing import _get

    products = await _get("/v1/products?active=true&limit=100")
    prices = await _get("/v1/prices?active=true&limit=100&expand[]=data.tiers")

    by_product: dict[str, list[dict[str, Any]]] = {}
    for price in prices.get("data") or []:
        product = price.get("product")
        if isinstance(product, str):
            by_product.setdefault(product, []).append(price)

    plans: list[Plan] = []
    for product in products.get("data") or []:
        name = product.get("name") or ""
        if not name.startswith(STRIPE_PLAN_PRODUCT_PREFIX):
            continue
        base = metered = None
        for price in by_product.get(product["id"], []):
            recurring = price.get("recurring") or {}
            if recurring.get("usage_type") == "metered":
                metered = price
            elif recurring and base is None:
                base = price
        if base is None:
            logger.warning("Stripe plan {} has no monthly price; skipped", name)
            continue
        included, overage = _included_and_overage(metered) if metered else (0, None)
        plans.append(
            Plan(
                id=product["id"],
                name=_display_name(name),
                currency=(base.get("currency") or "eur").lower(),
                monthly_amount=int(base.get("unit_amount") or 0),
                interval=(base.get("recurring") or {}).get("interval", "month"),
                included_minutes=included,
                overage_per_minute=overage,
                base_price_id=base["id"],
                metered_price_id=metered["id"] if metered else None,
            )
        )

    plans.sort(key=lambda p: p.monthly_amount)
    return plans


async def list_plans(*, refresh: bool = False) -> list[Plan]:
    global _cache
    now = time.monotonic()
    if not refresh and _cache and now - _cache[0] < _CACHE_SECONDS:
        return _cache[1]
    try:
        plans = await _fetch()
    except Exception as e:
        logger.error("Could not load the plan catalog from Stripe: {}", e)
        # Serve the last good catalog rather than an empty page.
        return _cache[1] if _cache else []
    _cache = (now, plans)
    return plans


async def plan_by_id(plan_id: str) -> Plan | None:
    for plan in await list_plans():
        if plan.id == plan_id:
            return plan
    return None


async def plan_for_price(price_id: str) -> Plan | None:
    for plan in await list_plans():
        if price_id in (plan.base_price_id, plan.metered_price_id):
            return plan
    return None
