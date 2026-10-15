#!/usr/bin/env python3
"""Move each plan's metered overage price onto its own Stripe product.

Voice AiLunaPro — OURS. Why: when the licensed and metered prices share a
product, Checkout and invoices print the plan name and description twice. The
app (api/services/billing/plans.py) links an overage product to its plan with
the product metadata ``overage_for=<plan product id>``.

Same amounts, same tiers, same meter: nothing changes for billing.

Usage (key with write access on Products and Prices, never committed):

    export STRIPE_ADMIN_KEY=rk_live_...      # or sk_live_...
    python3 scripts/stripe/split_overage_products.py            # dry run
    python3 scripts/stripe/split_overage_products.py --apply    # create
    python3 scripts/stripe/split_overage_products.py --archive-old --apply

Run --archive-old only after the API that understands ``overage_for`` is
deployed and Checkout shows the new line. Archiving is reversible.
Stdlib only, idempotent: a plan that already has a linked overage product is
skipped.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

API = "https://api.stripe.com"
PREFIX = os.getenv("STRIPE_PLAN_PRODUCT_PREFIX", "AiLunaPro Voice")


def _key() -> str:
    key = os.getenv("STRIPE_ADMIN_KEY", "")
    if not key.startswith(("sk_", "rk_")):
        sys.exit("Set STRIPE_ADMIN_KEY (sk_ or rk_ key with Products/Prices write).")
    return key


def _flatten(data: dict, prefix: str = "") -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for k, v in data.items():
        name = f"{prefix}[{k}]" if prefix else str(k)
        if isinstance(v, dict):
            out += _flatten(v, name)
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    out += _flatten(item, f"{name}[{i}]")
                else:
                    out.append((f"{name}[{i}]", str(item)))
        elif v is not None:
            out.append((name, str(v).lower() if isinstance(v, bool) else str(v)))
    return out


def call(method: str, path: str, data: dict | None = None) -> dict:
    body = urllib.parse.urlencode(_flatten(data or {})).encode() if data else None
    req = urllib.request.Request(API + path, data=body, method=method)
    req.add_header("Authorization", f"Bearer {_key()}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        err = json.load(e).get("error", {})
        sys.exit(f"Stripe {e.code} on {method} {path}: {err.get('message')}")


def eur(minor: str | int | None) -> str:
    value = Decimal(str(minor or 0)) / 100
    return f"{value.normalize():f}".replace(".", ",") + " €"


def fr_int(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write to Stripe")
    ap.add_argument("--archive-old", action="store_true",
                    help="archive metered prices left on plan products")
    ap.add_argument("--fix-minutes", action="store_true",
                    help="align the minutes quoted in each plan description "
                         "with the free tier actually billed")
    ap.add_argument("--neutral-text", action="store_true",
                    help="drop the one-language descriptions: the app now sends "
                         "the offer in the customer's language with Checkout")
    args = ap.parse_args()

    products = call("GET", "/v1/products?active=true&limit=100")["data"]
    prices = call("GET", "/v1/prices?active=true&limit=100&expand[]=data.tiers")["data"]

    linked = {p["metadata"].get("overage_for"): p for p in products
              if p.get("metadata", {}).get("overage_for")}
    plans = [p for p in products if p["name"].startswith(PREFIX)
             and not p.get("metadata", {}).get("overage_for")]

    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"[{mode}] {len(plans)} plan(s), {len(linked)} overage product(s) linked")

    if args.neutral_text:
        for plan in sorted(plans, key=lambda p: p["name"]):
            name = plan["name"][len(PREFIX):].strip(" —-–:") or plan["name"]
            changes = [(plan, {"description": ""})]
            if plan["id"] in linked:
                changes.append((linked[plan["id"]],
                                {"name": f"{PREFIX} — {name} · +min", "description": ""}))
            for product, body in changes:
                if product.get("description") or product["name"] != body.get("name", product["name"]):
                    if args.apply:
                        call("POST", f"/v1/products/{product['id']}", body)
                    print(f"- {product['id']} {product['name']!r}: "
                          f"{'updated' if args.apply else 'would set'} {body}")
        if not args.apply:
            print("Nothing written. Re-run with --apply.")
        return

    for plan in sorted(plans, key=lambda p: p["name"]):
        name = plan["name"][len(PREFIX):].strip(" —-–:") or plan["name"]
        metered = [x for x in prices if x["product"] == plan["id"]
                   and (x.get("recurring") or {}).get("usage_type") == "metered"]
        if not metered:
            print(f"- {name}: no metered price on the plan product, nothing to do")
            continue
        old = metered[0]
        rec = old["recurring"]
        tiers = old.get("tiers") or []
        free = next((t for t in tiers if t.get("up_to") and not t.get("unit_amount")
                     and not Decimal(t.get("unit_amount_decimal") or 0)), None)
        paid = next((t for t in tiers if t.get("up_to") is None), {})
        included = int(free["up_to"]) if free else 0
        unit = paid.get("unit_amount_decimal") or paid.get("unit_amount")
        print(f"- {name}: {old['id']} meter={rec.get('meter')} "
              f"included={included} overage={eur(unit)}/min")
        desc = plan.get("description") or ""
        print(f"    description: {desc}")
        quoted = re.match(r"\s*([\d,. ]+)\s+AI voice agent minutes", desc)
        if quoted and int(re.sub(r"\D", "", quoted.group(1))) != included:
            print(f"    MISMATCH: description says {quoted.group(1).strip()}, "
                  f"billing includes {included}")
            if args.fix_minutes:
                fixed = desc[:quoted.start(1)] + f"{included:,}" + desc[quoted.end(1):]
                if args.apply:
                    call("POST", f"/v1/products/{plan['id']}", {"description": fixed})
                print(f"    {'fixed' if args.apply else 'would fix'} -> {fixed[:60]}...")

        if args.archive_old:
            if plan["id"] not in linked:
                print("    skip archive: no linked overage product yet")
                continue
            if args.apply:
                call("POST", f"/v1/prices/{old['id']}", {"active": False})
            print(f"    {'archived' if args.apply else 'would archive'} {old['id']}")
            continue

        if plan["id"] in linked:
            print(f"    already linked: {linked[plan['id']]['id']}")
            continue

        description = (f"Minutes d'agent vocal IA au-delà des {fr_int(included)} incluses "
                       f"dans la formule {name} : {eur(unit)} la minute. "
                       "Facturées en fin de mois selon l'utilisation réelle.")
        product = {
            "name": f"Minutes supplémentaires — {name}",
            "description": description,
            "metadata": {"overage_for": plan["id"]},
            "tax_code": plan.get("tax_code"),
            "images": plan.get("images") or [],
        }
        new_tiers = []
        for t in tiers:
            tier = {"up_to": t["up_to"] if t.get("up_to") is not None else "inf"}
            if t.get("unit_amount_decimal") is not None:
                tier["unit_amount_decimal"] = t["unit_amount_decimal"]
            if t.get("flat_amount_decimal") is not None:
                tier["flat_amount_decimal"] = t["flat_amount_decimal"]
            new_tiers.append(tier)
        price = {
            "currency": old["currency"],
            "nickname": f"{name} — dépassement",
            "billing_scheme": "tiered",
            "tiers_mode": old.get("tiers_mode") or "graduated",
            "tiers": new_tiers,
            "recurring": {
                "interval": rec["interval"],
                "interval_count": rec.get("interval_count", 1),
                "usage_type": "metered",
                "meter": rec.get("meter"),
            },
            "tax_behavior": old.get("tax_behavior"),
        }
        if not args.apply:
            print(f"    would create product {product['name']!r} + price {new_tiers}")
            continue
        created = call("POST", "/v1/products", product)
        price["product"] = created["id"]
        new_price = call("POST", "/v1/prices", price)
        print(f"    created {created['id']} + {new_price['id']}")

    if not args.apply:
        print("Nothing written. Re-run with --apply.")


if __name__ == "__main__":
    main()
