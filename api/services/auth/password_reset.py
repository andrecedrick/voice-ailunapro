"""Forgotten-password flow. Voice AiLunaPro — OURS.

Same shape as the sign-up confirmation: a signed, short-lived JWT instead of a
database table. The one extra ingredient is `fp`, a fingerprint of the password
hash the account had when the link was issued. Changing the password changes
the hash, which changes the fingerprint, which makes every link issued before
that point fail - so a reset link is single-use without storing anything, and
an old link found in an inbox months later is already dead.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

import jwt
from loguru import logger

from api.constants import OSS_JWT_SECRET, PASSWORD_RESET_TTL_MINUTES, UI_APP_URL
from api.services.email import is_configured as smtp_configured
from api.services.email import send_email
from api.services.email.messages import CHANGED, RESET, build

_PURPOSE = "reset_password"


def reset_available() -> bool:
    """Without outgoing mail there is no way to deliver the link."""
    return smtp_configured()


def _fingerprint(password_hash: str) -> str:
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


def create_reset_token(user_id: int, email: str, password_hash: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email.lower(),
        "fp": _fingerprint(password_hash),
        "purpose": _PURPOSE,
        "exp": datetime.now(UTC) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES),
    }
    return jwt.encode(payload, OSS_JWT_SECRET, algorithm="HS256")


def read_reset_token(token: str) -> tuple[int, str, str] | None:
    """Return (user_id, email, fingerprint) for a structurally valid token.

    The caller still has to check the fingerprint against the account's current
    password hash; this only proves we issued the token and that it has not
    expired.
    """
    try:
        payload = jwt.decode(token, OSS_JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != _PURPOSE:
        # A sign-in or confirmation JWT must never reset a password.
        return None
    try:
        return int(payload["sub"]), str(payload["email"]), str(payload["fp"])
    except (KeyError, TypeError, ValueError):
        return None


def token_matches(token_fingerprint: str, password_hash: str) -> bool:
    return token_fingerprint == _fingerprint(password_hash)


async def send_reset_email(
    *, user_id: int, email: str, password_hash: str, locale: str | None
) -> None:
    token = create_reset_token(user_id, email, password_hash)
    link = f"{UI_APP_URL.rstrip('/')}/auth/reset?token={token}"
    subject, text, html = build(
        RESET, locale=locale, url=link, minutes=PASSWORD_RESET_TTL_MINUTES
    )
    try:
        await send_email(to=email, subject=subject, text=text, html=html)
    except Exception as e:  # noqa: BLE001
        # Never surface this: the endpoint answers the same way either way, so
        # that it cannot be used to find out which addresses have an account.
        logger.error("Could not send the reset email (user {}): {}", user_id, e)


async def send_password_changed_email(*, email: str, locale: str | None) -> None:
    """Tell the account holder their password moved. This is the only signal a
    victim of a takeover gets, so it goes out even when they did it themselves."""
    link = f"{UI_APP_URL.rstrip('/')}/auth/login"
    subject, text, html = build(CHANGED, locale=locale, url=link)
    try:
        await send_email(to=email, subject=subject, text=text, html=html)
    except Exception as e:  # noqa: BLE001
        logger.warning("Could not send the password-changed email: {}", type(e).__name__)
