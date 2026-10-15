"""Sign-up email confirmation. Voice AiLunaPro — OURS.

The link carries a signed, short-lived JWT (purpose="verify_email") rather than
a database token, so no table is needed: the signature proves we issued it, the
expiry bounds it, and confirming twice is harmless.
"""

from __future__ import annotations

import html as html_lib
from datetime import UTC, datetime, timedelta

import jwt
from loguru import logger

from api.constants import EMAIL_VERIFICATION_TTL_HOURS, OSS_JWT_SECRET, UI_APP_URL
from api.services.email import is_configured as smtp_configured
from api.services.email import send_email

_PURPOSE = "verify_email"
_SUPPORTED = {"en", "fr", "es", "de", "it", "pt", "ru", "zh"}


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


# (subject, heading, body, button, ignore) per language.
_COPY: dict[str, tuple[str, str, str, str, str]] = {
    "en": (
        "Confirm your Voice AiLunaPro account",
        "Confirm your email address",
        "Welcome to Voice AiLunaPro. Confirm your address to activate your account. The link is valid for {hours} hours.",
        "Confirm my email",
        "If you did not create an account, you can ignore this email.",
    ),
    "fr": (
        "Confirmez votre compte Voice AiLunaPro",
        "Confirmez votre adresse e-mail",
        "Bienvenue sur Voice AiLunaPro. Confirmez votre adresse pour activer votre compte. Le lien est valable {hours} heures.",
        "Confirmer mon e-mail",
        "Si vous n'avez pas créé de compte, ignorez simplement cet e-mail.",
    ),
    "es": (
        "Confirma tu cuenta de Voice AiLunaPro",
        "Confirma tu dirección de correo",
        "Bienvenido a Voice AiLunaPro. Confirma tu dirección para activar tu cuenta. El enlace es válido durante {hours} horas.",
        "Confirmar mi correo",
        "Si no creaste una cuenta, puedes ignorar este correo.",
    ),
    "de": (
        "Bestätigen Sie Ihr Voice-AiLunaPro-Konto",
        "Bestätigen Sie Ihre E-Mail-Adresse",
        "Willkommen bei Voice AiLunaPro. Bestätigen Sie Ihre Adresse, um Ihr Konto zu aktivieren. Der Link ist {hours} Stunden gültig.",
        "E-Mail bestätigen",
        "Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.",
    ),
    "it": (
        "Conferma il tuo account Voice AiLunaPro",
        "Conferma il tuo indirizzo e-mail",
        "Benvenuto in Voice AiLunaPro. Conferma il tuo indirizzo per attivare l'account. Il link è valido per {hours} ore.",
        "Conferma la mia e-mail",
        "Se non hai creato un account, ignora questa e-mail.",
    ),
    "pt": (
        "Confirme a sua conta Voice AiLunaPro",
        "Confirme o seu endereço de e-mail",
        "Bem-vindo ao Voice AiLunaPro. Confirme o seu endereço para ativar a conta. A ligação é válida durante {hours} horas.",
        "Confirmar o meu e-mail",
        "Se não criou uma conta, pode ignorar este e-mail.",
    ),
    "ru": (
        "Подтвердите аккаунт Voice AiLunaPro",
        "Подтвердите адрес эл. почты",
        "Добро пожаловать в Voice AiLunaPro. Подтвердите адрес, чтобы активировать аккаунт. Ссылка действует {hours} ч.",
        "Подтвердить эл. почту",
        "Если вы не создавали аккаунт, просто проигнорируйте это письмо.",
    ),
    "zh": (
        "确认您的 Voice AiLunaPro 账户",
        "确认您的邮箱地址",
        "欢迎使用 Voice AiLunaPro。请确认您的邮箱以激活账户。链接 {hours} 小时内有效。",
        "确认邮箱",
        "如果您没有创建账户，请忽略此邮件。",
    ),
}


def _render(locale: str, link: str) -> tuple[str, str, str]:
    subject, heading, body, button, ignore = _COPY.get(locale, _COPY["en"])
    body = body.format(hours=EMAIL_VERIFICATION_TTL_HOURS)
    text = f"{heading}\n\n{body}\n\n{link}\n\n{ignore}\n\n— Voice AiLunaPro"
    e = html_lib.escape
    html = f"""<!doctype html>
<html lang="{e(locale)}"><body style="margin:0;padding:0;background:#070912;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8ecf7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070912;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0e1220;border:1px solid rgba(140,160,255,.16);border-radius:20px">
<tr><td style="padding:36px 32px 8px">
<div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:#22d3ee">AiLunaPro Voice</div>
</td></tr>
<tr><td style="padding:16px 32px 0">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#f4f7ff">{e(heading)}</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a9b1c7">{e(body)}</p>
<a href="{e(link)}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#22d3ee;background-image:linear-gradient(120deg,#22d3ee,#7de9f7 45%,#a78bfa);color:#05131a;font-weight:700;font-size:15px;text-decoration:none">{e(button)}</a>
<p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#6f7893;word-break:break-all">{e(link)}</p>
</td></tr>
<tr><td style="padding:24px 32px 32px">
<p style="margin:0;font-size:12px;color:#6f7893">{e(ignore)}</p>
</td></tr>
</table>
<p style="margin:18px 0 0;font-size:11px;color:#4f5872">Voice AiLunaPro · service@ailunapro.com</p>
</td></tr></table></body></html>"""
    return subject, text, html


async def send_verification_email(*, user_id: int, email: str, locale: str | None) -> None:
    lang = locale if locale in _SUPPORTED else "en"
    token = create_verification_token(user_id, email)
    link = f"{UI_APP_URL.rstrip('/')}/auth/verify?token={token}"
    subject, text, html = _render(lang, link)
    try:
        await send_email(to=email, subject=subject, text=text, html=html)
    except Exception as e:
        # The account exists either way; the user can ask for a new link.
        logger.error("Could not send the verification email (user {}): {}", user_id, e)
