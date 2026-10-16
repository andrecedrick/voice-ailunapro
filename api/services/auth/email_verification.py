"""Sign-up email confirmation. Voice AiLunaPro — OURS.

The link carries a signed, short-lived JWT (purpose="verify_email") rather than
a database token, so no table is needed: the signature proves we issued it, the
expiry bounds it, and confirming twice is harmless.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from loguru import logger

from api.constants import EMAIL_VERIFICATION_TTL_HOURS, OSS_JWT_SECRET, UI_APP_URL
from api.services.email import is_configured as smtp_configured
from api.services.email import send_email
from api.services.email.messages import SUPPORTED, VERIFY, WELCOME, build

_PURPOSE = "verify_email"


def verification_required() -> bool:
    """Confirmation is enforced only once outgoing mail works."""
    return smtp_configured()


def create_verification_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email.lower(),
        "purpose": _PURPOSE,
        "exp": datetime.now(UTC) + timedelta(hours=EMAIL_VERIFICATION_TTL_HOURS),
    }
    return jwt.encode(payload, OSS_JWT_SECRET, algorithm="HS256")


def read_verification_token(token: str) -> tuple[int, str] | None:
    """Return (user_id, email) for a valid token, None otherwise."""
    try:
        payload = jwt.decode(token, OSS_JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != _PURPOSE:
        # A sign-in JWT must never confirm an address, and vice versa.
        return None
    try:
        return int(payload["sub"]), str(payload["email"])
    except (KeyError, TypeError, ValueError):
        return None


async def send_verification_email(*, user_id: int, email: str, locale: str | None) -> None:
    lang = locale if locale in SUPPORTED else "en"
    token = create_verification_token(user_id, email)
    link = f"{UI_APP_URL.rstrip('/')}/auth/verify?token={token}"
    subject, text, html = build(
        VERIFY, locale=lang, url=link, hours=EMAIL_VERIFICATION_TTL_HOURS
    )
    try:
        await send_email(to=email, subject=subject, text=text, html=html)
    except Exception as e:  # noqa: BLE001
        # The account exists either way; the user can ask for a new link.
        logger.error("Could not send the verification email (user {}): {}", user_id, e)


async def send_welcome_email(*, email: str, locale: str | None) -> None:
    """Sent once the address is confirmed. The customer is never more willing
    to build their first agent than in the minute after confirming, so this
    points straight at the dashboard rather than at a feature tour."""
    link = f"{UI_APP_URL.rstrip('/')}/"
    subject, text, html = build(WELCOME, locale=locale, url=link)
    try:
        await send_email(to=email, subject=subject, text=text, html=html)
    except Exception as e:  # noqa: BLE001
        # The account is confirmed either way; a missing welcome is cosmetic.
        logger.warning("Could not send the welcome email: {}", type(e).__name__)
