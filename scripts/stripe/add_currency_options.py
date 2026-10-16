#!/usr/bin/env python3
"""Add presentment currencies to the Voice AiLunaPro plan prices. OURS.

Stripe lets a Price carry `currency_options`: extra currencies the same price
can be charged in, each with its own amount. That is an update on the existing
price, so nothing is recreated and live subscriptions keep their EUR amount -
the new currencies only apply to checkouts that pick them.

We never convert at runtime: every amount below is a price we chose, rounded to
a figure that reads like a price in that market and that keeps the margin we
have in EUR. Adaptive Pricing must be turned OFF in the Dashboard once this
runs, otherwise Stripe converts on top of these and takes its 4%.

The overage price is a graduated metered price. Its tiers are read from Stripe
and rebuilt per currency with the rates in OVERAGE below, so the tier shape
(included minutes at 0, then per-minute) always matches whatever is live.

Usage (key never stored, never logged):

    export STRIPE_ADMIN_KEY=rk_live_...     # restricted key, plan_write only
    python scripts/stripe/add_currency_options.py            # dry run
    python scripts/stripe/add_currency_options.py --apply
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any

import httpx

API = "https://api.stripe.com"
PREFIX = "AiLunaPro Voice — "
CURRENCIES = ("usd", "gbp", "chf", "cad", "aed")

# Monthly price per plan, in the smallest unit of each currency.
# Reference rates 2026-10-15: USD 1.1208, GBP 0.8461, CHF 0.9305, CAD 1.5923,
# AED 4.116 (USD peg). Every figure sits at or above parity with EUR.
MONTHLY: dict[int, dict[str, int]] = {
    #  EUR cents        usd      gbp      chf       cad       aed
    3900: {"usd": 4500, "gbp": 3500, "chf": 3900, "cad": 6500, "aed": 16900},
    14900: {"usd": 16900, "gbp": 12900, "chf": 14900, "cad": 23900, "aed": 62900},
    44900: {"usd": 52900, "gbp": 38900, "chf": 43900, "cad": 73900, "aed": 189900},
    99900: {"usd": 114900, "gbp": 86900, "chf": 94900, "cad": 162900, "aed": 419900},
}

# Per-minute overage, keyed by the EUR amount in cents.
OVERAGE: dict[int, dict[str, int]] = {
    15: {"usd": 17, "gbp": 13, "chf": 15, "cad": 25, "aed": 65},
    11: {"usd": 13, "gbp": 10, "chf": 11, "cad": 18, "aed": 49},
    9: {"usd": 10, "gbp": 8, "chf": 9, "cad": 15, "aed": 39},
    6: {"usd": 7, "gbp": 6, "chf": 6, "cad": 10, "aed": 27},
}


def _client(key: str) -> httpx.Client:
    return httpx.Client(
        base_url=API,
        headers={"Authorization": f"Bearer {key}"},
        timeout=30,
    )


def _get(c: httpx.Client, path: str) -> dict[str, Any]:
    r = c.get(path)
    r.raise_for_status()
    return r.json()


def _post(c: httpx.Client, path: str, data: dict[str, str]) -> dict[str, Any]:
    r = c.post(path, data=data)
    r.raise_for_status()
    return r.json()


def plan_products(c: httpx.Client) -> list[dict]:
    page = _get(c, "/v1/products?active=true&limit=100")
    return [p for p in page.get("data") or [] if (p.get("name") or "").startswith(PREFIX)]


def prices_for(c: httpx.Client, product_id: str) -> list[dict]:
    page = _get(
        c,
        f"/v1/prices?product={product_id}&active=true&limit=100"
        "&expand[]=data.tiers&expand[]=data.currency_options",
    )
    return page.get("data") or []


def licensed_body(amount_eur: int) -> dict[str, str] | None:
    """currency_options for a flat monthly price."""
    table = MONTHLY.get(amount_eur)
    if not table:
        return None
    body: dict[str, str] = {}
    for code in CURRENCIES:
        body[f"currency_options[{code}][unit_amount]"] = str(table[code])
    return body


def metered_body(tiers: list[dict]) -> dict[str, str] | None:
    """currency_options for the graduated overage price.

    Tier shape is copied from the live price; only the per-minute amount is
    swapped for the currency's own rate, so a tier priced at 0 stays at 0.
    """
    rate_eur = next(
        (int(t["unit_amount"]) for t in tiers if int(t.get("unit_amount") or 0) > 0),
        None,
    )
    table = OVERAGE.get(rate_eur or -1)
    if not table:
        return None
    body: dict[str, str] = {}
    for code in CURRENCIES:
        for i, tier in enumerate(tiers):
            eur = int(tier.get("unit_amount") or 0)
            amount = table[code] if eur > 0 else 0
            key = f"currency_options[{code}][tiers][{i}]"
            body[f"{key}[unit_amount]"] = str(amount)
            up_to = tier.get("up_to")
            body[f"{key}[up_to]"] = "inf" if up_to is None else str(up_to)
    return body


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write to Stripe")
    args = ap.parse_args()

    key = os.environ.get("STRIPE_ADMIN_KEY", "").strip()
    if not key:
        print("STRIPE_ADMIN_KEY is not set.", file=sys.stderr)
        return 2

    planned: list[tuple[str, str, dict[str, str]]] = []
    with _client(key) as c:
        for product in plan_products(c):
            label = (product.get("name") or "")[len(PREFIX) :]
            for price in prices_for(c, product["id"]):
                if price.get("currency") != "eur":
                    continue
                metered = (price.get("recurring") or {}).get("usage_type") == "metered"
                body = (
                    metered_body(price.get("tiers") or [])
                    if metered
                    else licensed_body(int(price.get("unit_amount") or 0))
                )
                if not body:
                    print(f"  ! {label}: no table for {price['id']}, skipped")
                    continue
                kind = "overage" if metered else "monthly"
                planned.append((f"{label} {kind}", price["id"], body))

        if not planned:
            print("Nothing to do: no matching EUR prices found.")
            return 1

        for label, price_id, body in planned:
            amounts = ", ".join(
                f"{k.split('[')[1].rstrip(']')} {v}"
                for k, v in body.items()
                if k.endswith("[unit_amount]")
            )
            print(f"{'APPLY' if args.apply else 'DRY  '} {label:<22} {price_id}  {amounts}")
            if args.apply:
                _post(c, f"/v1/prices/{price_id}", body)

    if not args.apply:
        print("\nDry run. Re-run with --apply to write these to Stripe.")
    else:
        print("\nDone. Turn Adaptive Pricing OFF in the Dashboard so Stripe stops")
        print("converting on top of these prices and charging 4% for it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
