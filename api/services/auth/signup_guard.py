"""Bot protection for sign-up and sign-in. Voice AiLunaPro — OURS.

Layers, cheapest first:

1. Honeypot — a field real users never see. Filled = a bot.
2. Fill time — a human takes seconds to type an email and two passwords;
   a script posts in milliseconds.
3. Disposable inboxes — throwaway domains that exist only to farm trials.
4. Per-IP rate limit in Redis over a rolling hour.
5. Cloudflare Turnstile, when its keys are configured — the layer that
   stops a determined bot; 1–4 only thin out the lazy ones.

Bots tripping 1 or 2 are answered as if sign-up succeeded, so they learn
nothing from the response. Rate limits and Turnstile answer honestly: a real
person can hit them and needs to know what to do.
"""

from __future__ import annotations

import time

import httpx
import redis.asyncio as aioredis
from fastapi import HTTPException, Request
from loguru import logger

from api.constants import (
    LOGIN_MAX_PER_IP_PER_HOUR,
    REDIS_URL,
    SIGNUP_MAX_PER_IP_PER_HOUR,
    TURNSTILE_SECRET_KEY,
    TURNSTILE_SITE_KEY,
)

MIN_FILL_SECONDS = 3.0

# Short, high-signal list: the domains behind most throwaway sign-ups.
DISPOSABLE_DOMAINS = frozenset(
    {
        "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
        "anonaddy.me", "burnermail.io", "discard.email", "dispostable.com",
        "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemail.net",
        "getairmail.com", "getnada.com", "guerrillamail.com", "guerrillamail.net",
        "guerrillamail.org", "guerrillamailblock.com", "inboxkitten.com",
        "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com",
        "mailpoof.com", "mintemail.com", "moakt.com", "mohmal.com",
        "mytemp.email", "nada.email", "sharklasers.com", "spamgourmet.com",
        "temp-mail.io", "temp-mail.org", "tempail.com", "tempmail.com",
        "tempmail.net", "tempmailo.com", "tempr.email", "throwawaymail.com",
        "trashmail.com", "trashmail.de", "yopmail.com", "yopmail.fr",
        "yopmail.net",
    }
)

_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


def client_ip(request: Request) -> str:
    """Best-effort client address behind nginx and the Next.js proxy."""
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def turnstile_enabled() -> bool:
    return bool(TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY)


def looks_like_bot(*, honeypot: str | None, started_at_ms: int | None) -> bool:
    if honeypot:
        return True
    if started_at_ms:
        elapsed = time.time() - started_at_ms / 1000.0
        # Negative = clock skew between browser and server; don't punish it.
        if 0 <= elapsed < MIN_FILL_SECONDS:
            return True
    return False


def is_disposable(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1].lower().strip()
    return domain in DISPOSABLE_DOMAINS or any(
        domain.endswith(f".{d}") for d in DISPOSABLE_DOMAINS
    )


async def enforce_rate_limit(request: Request, bucket: str) -> None:
    """Raise 429 once an IP passes its hourly allowance for `bucket`.

    Fails open: if Redis is down, nobody is locked out of signing in.
    """
    limit = SIGNUP_MAX_PER_IP_PER_HOUR if bucket == "signup" else LOGIN_MAX_PER_IP_PER_HOUR
    key = f"al:rl:{bucket}:{client_ip(request)}"
    try:
        r = await _get_redis()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, 3600)
    except Exception as e:
        logger.warning("Rate limit check skipped ({}): {}", bucket, e)
        return
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts from this network. Please try again in an hour.",
        )


async def verify_turnstile(token: str | None, request: Request) -> None:
    """Raise 400 unless Cloudflare confirms the challenge. No-op when disabled."""
    if not turnstile_enabled():
        return
    if not token:
        raise HTTPException(status_code=400, detail="Please complete the security check.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.post(
                _TURNSTILE_VERIFY_URL,
                data={
                    "secret": TURNSTILE_SECRET_KEY,
                    "response": token,
                    "remoteip": client_ip(request),
                },
            )
        result = response.json()
    except Exception as e:
        # Cloudflare unreachable: let the person through rather than block
        # every sign-up; the other layers still apply.
        logger.error("Turnstile verification unavailable: {}", e)
        return
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Security check failed. Please try again.")
