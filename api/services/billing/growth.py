"""Founders offer and influencer codes, all state kept in Stripe. OURS.

No database table: the founders counter is the number of live subscriptions
tagged ``founder=1``; an influencer is a Stripe promotion code ``LUNA-<HANDLE>``
whose metadata holds the influencer's contact. Their dashboard link carries an
HMAC of the code, so nobody can read another influencer's numbers.

Everything shown to visitors is real: a fixed end date (same for everyone),
seats counted from Stripe, and a discount that drops wave by wave as seats go.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

from api.constants import OSS_JWT_SECRET

FOUNDER_SEATS = int(os.getenv("FOUNDER_SEATS", "30"))
FOUNDER_ENDS_AT = os.getenv("FOUNDER_ENDS_AT", "2026-12-31T23:59:00+01:00")
# "seats:percent" per wave, in order. Percent off the first month.
FOUNDER_WAVES = os.getenv("FOUNDER_WAVES", "10:30,10:20,10:0")
PARTNER_PERCENT_OFF = int(os.getenv("PARTNER_PERCENT_OFF", "20"))
PARTNER_COMMISSION_PCT = int(os.getenv("PARTNER_COMMISSION_PCT", "25"))
# Higher rate once a partner has this many paying customers at once.
PARTNER_TIER_PCT = int(os.getenv("PARTNER_TIER_PCT", "30"))
PARTNER_TIER_MIN = int(os.getenv("PARTNER_TIER_MIN", "10"))
CODE_PREFIX = "LUNA-"
_LIVE = {"trialing", "active", "past_due"}
_CACHE_SECONDS = 60
_cache: dict[str, tuple[float, Any]] = {}


def _waves() -> list[tuple[int, int]]:
    out = []
    for part in FOUNDER_WAVES.split(","):
        seats, _, pct = part.strip().partition(":")
        if seats.isdigit():
            out.append((int(seats), int(pct or 0)))
    return out


def coupon_id(percent: int) -> str:
    return f"ailp_first_month_{percent}"


@dataclass
class FounderState:
    seats_total: int
    seats_taken: int
    seats_left: int
    ends_at: str
    open: bool
    wave: int
    wave_seats_left: int
    percent_off: int
    next_percent_off: int | None


def founder_state(taken: int, now: float | None = None) -> FounderState:
    """Pure: where the offer stands for a given number of founders."""
    now = time.time() if now is None else now
    ends = datetime.fromisoformat(FOUNDER_ENDS_AT).timestamp()
    left = max(0, FOUNDER_SEATS - taken)
    is_open = left > 0 and now < ends
    wave, wave_left, pct, nxt = 0, 0, 0, None
    seen = 0
    waves = _waves()
    for i, (seats, percent) in enumerate(waves):
        if taken < seen + seats:
            wave, wave_left, pct = i + 1, seen + seats - taken, percent
            nxt = waves[i + 1][1] if i + 1 < len(waves) else None
            break
        seen += seats
    if not is_open:
        wave, wave_left, pct, nxt = 0, 0, 0, None
    return FounderState(
        seats_total=FOUNDER_SEATS,
        seats_taken=min(taken, FOUNDER_SEATS),
        seats_left=left,
        ends_at=FOUNDER_ENDS_AT,
        open=is_open,
        wave=wave,
        wave_seats_left=wave_left,
        percent_off=pct,
        next_percent_off=nxt,
    )


def normalize_handle(raw: str) -> str:
    handle = re.sub(r"[^A-Z0-9]", "", (raw or "").upper())[:20]
    return handle


def partner_token(code: str) -> str:
    return hmac.new(
        OSS_JWT_SECRET.encode(), f"partner:{code}".encode(), hashlib.sha256
    ).hexdigest()[:32]


def check_partner_token(code: str, token: str) -> bool:
    return hmac.compare_digest(partner_token(code), token or "")


async def _cached(key: str, loader):
    hit = _cache.get(key)
    if hit and time.monotonic() - hit[0] < _CACHE_SECONDS:
        return hit[1]
    value = await loader()
    _cache[key] = (time.monotonic(), value)
    return value


async def _subscriptions() -> list[dict]:
    from api.services.billing.stripe_billing import _get

    async def load():
        subs: list[dict] = []
        cursor = ""
        for _ in range(20):
            page = await _get(
                "/v1/subscriptions?status=all&limit=100&expand[]=data.discounts"
                + (f"&starting_after={cursor}" if cursor else "")
            )
            subs += page.get("data") or []
            if not page.get("has_more") or not subs:
                break
            cursor = subs[-1]["id"]
        return subs

    return await _cached("subs", load)


async def count_founders() -> int:
    return sum(
        1
        for s in await _subscriptions()
        if (s.get("metadata") or {}).get("founder") == "1"
        and s.get("status") in _LIVE
    )


async def current_founder_state() -> FounderState:
    return founder_state(await count_founders())


async def ensure_coupon(percent: int) -> str:
    """Create the 'first month -N%' coupon once; idempotent by fixed id."""
    from api.services.billing.stripe_billing import _get, _post

    cid = coupon_id(percent)
    try:
        await _get(f"/v1/coupons/{cid}")
    except Exception:
        await _post(
            "/v1/coupons",
            {
                "id": cid,
                "percent_off": str(percent),
                "duration": "once",
                "name": f"-{percent}% 1er mois / first month",
            },
            idempotency_key=f"coupon-{cid}",
        )
    return cid


async def find_promotion_code(code: str) -> dict | None:
    from api.services.billing.stripe_billing import _get

    page = await _get(f"/v1/promotion_codes?code={code}&limit=1")
    data = page.get("data") or []
    return data[0] if data else None


async def create_partner(*, name: str, email: str, handle: str) -> dict:
    """Create LUNA-<HANDLE> once. Raises ValueError if taken by someone else."""
    from api.services.billing.stripe_billing import _post

    code = CODE_PREFIX + normalize_handle(handle)
    if len(code) <= len(CODE_PREFIX) + 1:
        raise ValueError("invalid_handle")
    existing = await find_promotion_code(code)
    if existing:
        if (existing.get("metadata") or {}).get("email", "").lower() != email.lower():
            raise ValueError("code_taken")
        return existing
    cid = await ensure_coupon(PARTNER_PERCENT_OFF)
    return await _post(
        "/v1/promotion_codes",
        {
            "coupon": cid,
            "code": code,
            "metadata[partner]": "1",
            "metadata[name]": name[:80],
            "metadata[email]": email[:120],
        },
        idempotency_key=f"partner-{code}",
    )


def _promo_id(discount: Any) -> str | None:
    if isinstance(discount, dict):
        promo = discount.get("promotion_code")
        return promo if isinstance(promo, str) else (promo or {}).get("id")
    return None


async def partner_stats(promotion_code_id: str, code: str) -> dict:
    """Customers who subscribed with this code, and the commission they earn."""
    from api.services.billing.plans import plan_for_price

    signups = live = 0
    mrr_cents = 0
    for s in await _subscriptions():
        tagged = (s.get("metadata") or {}).get("partner_code") == code
        typed = any(
            _promo_id(d) == promotion_code_id for d in s.get("discounts") or []
        )
        if not (tagged or typed):
            continue
        signups += 1
        if s.get("status") not in _LIVE:
            continue
        live += 1
        for item in (s.get("items") or {}).get("data") or []:
            price = item.get("price") or {}
            if (price.get("recurring") or {}).get("usage_type") == "metered":
                continue
            if await plan_for_price(price.get("id", "")):
                mrr_cents += int(price.get("unit_amount") or 0) * int(
                    item.get("quantity") or 1
                )
    pct = commission_pct(live)
    return {
        "signups": signups,
        "active": live,
        "mrr_cents": mrr_cents,
        "commission_pct": pct,
        "commission_cents": mrr_cents * pct // 100,
        "tier_pct": PARTNER_TIER_PCT,
        "tier_min": PARTNER_TIER_MIN,
    }


def commission_pct(active_customers: int) -> int:
    """25 % of every payment, 30 % once 10 paying customers are active."""
    return PARTNER_TIER_PCT if active_customers >= PARTNER_TIER_MIN else PARTNER_COMMISSION_PCT


def programme_terms() -> dict:
    return {
        "percent_off": PARTNER_PERCENT_OFF,
        "commission_pct": PARTNER_COMMISSION_PCT,
        "tier_pct": PARTNER_TIER_PCT,
        "tier_min": PARTNER_TIER_MIN,
    }


def state_dict(state: FounderState) -> dict:
    return asdict(state)
