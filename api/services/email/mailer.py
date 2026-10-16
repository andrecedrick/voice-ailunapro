"""SMTP mailer. Voice AiLunaPro — OURS, upstream has no services/email/.

Plain smtplib run in a worker thread: one message per sign-up does not justify
a new async dependency. Port 465 speaks implicit TLS, anything else upgrades
with STARTTLS; a server that offers neither is refused rather than used in the
clear, because the message carries a sign-in link.
"""

from __future__ import annotations

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import make_msgid

from loguru import logger

from api.constants import (
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_REPLY_TO,
    SMTP_USERNAME,
)

_TIMEOUT_SECONDS = 20


def is_configured() -> bool:
    return bool(SMTP_HOST)


def _send_blocking(message: EmailMessage) -> None:
    context = ssl.create_default_context()
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(
            SMTP_HOST, SMTP_PORT, timeout=_TIMEOUT_SECONDS, context=context
        ) as smtp:
            if SMTP_USERNAME:
                smtp.login(SMTP_USERNAME, SMTP_PASSWORD or "")
            smtp.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=_TIMEOUT_SECONDS) as smtp:
        smtp.ehlo()
        if not smtp.has_extn("starttls"):
            raise RuntimeError("SMTP server does not offer STARTTLS; refusing to send in clear")
        smtp.starttls(context=context)
        smtp.ehlo()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD or "")
        smtp.send_message(message)


async def send_email(*, to: str, subject: str, text: str, html: str) -> None:
    """Send one message. Raises on failure; callers decide whether that matters."""
    if not is_configured():
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    if SMTP_REPLY_TO:
        message["Reply-To"] = SMTP_REPLY_TO
    message["Message-ID"] = make_msgid(domain="ailunapro.com")
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    await asyncio.to_thread(_send_blocking, message)
    # Never log the address in full: it is personal data.
    logger.info("Sent '{}' to ***@{}", subject, to.rsplit("@", 1)[-1])
