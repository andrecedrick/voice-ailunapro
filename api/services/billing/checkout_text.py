"""Checkout text in the customer's language. Voice AiLunaPro — OURS.

Stripe product names and descriptions exist in one language only, so the plan
products carry no description and the explanation of the offer is sent with
each Checkout session as ``custom_text[submit][message]``, in the language the
customer uses in the app. Stripe's own Checkout UI follows ``locale``.
"""

from __future__ import annotations

from decimal import Decimal

# App locales (ui/src/i18n/config.ts) → Stripe Checkout / portal locales.
STRIPE_LOCALES = {
    "en": "en",
    "fr": "fr",
    "es": "es",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "ru": "ru",
    "zh": "zh",
}

# (thousands separator, decimal separator, currency before amount)
_NUMBER_STYLE = {
    "en": (",", ".", True),
    "zh": (",", ".", True),
    "fr": (" ", ",", False),
    "es": (".", ",", False),
    "de": (".", ",", False),
    "it": (".", ",", False),
    "pt": (" ", ",", False),
    "ru": (" ", ",", False),
}

_SYMBOLS = {"eur": "€", "usd": "$", "gbp": "£"}

_OFFER = {
    "en": "{plan}: {minutes} AI voice agent minutes included per month, then "
    "{price} per extra minute, billed on actual usage. Bring your own "
    "telephony provider.",
    "fr": "{plan} : {minutes} minutes d'agent vocal IA incluses par mois, puis "
    "{price} la minute supplémentaire, facturée selon l'utilisation réelle. "
    "Vous utilisez votre propre opérateur téléphonique.",
    "es": "{plan}: {minutes} minutos de agente de voz IA incluidos al mes, "
    "después {price} por minuto adicional, facturado según el uso real. "
    "Usa tu propio proveedor de telefonía.",
    "de": "{plan}: {minutes} Minuten KI-Sprachagent pro Monat inklusive, danach "
    "{price} pro zusätzlicher Minute, abgerechnet nach tatsächlicher Nutzung. "
    "Sie nutzen Ihren eigenen Telefonieanbieter.",
    "it": "{plan}: {minutes} minuti di agente vocale IA inclusi al mese, poi "
    "{price} per ogni minuto aggiuntivo, fatturato in base all'uso reale. "
    "Usi il tuo operatore telefonico.",
    "pt": "{plan}: {minutes} minutos de agente de voz IA incluídos por mês, "
    "depois {price} por minuto adicional, faturado de acordo com a utilização "
    "real. Utiliza o seu próprio operador de telefonia.",
    "ru": "{plan}: {minutes} минут работы голосового ИИ-агента в месяц включено, "
    "далее {price} за каждую дополнительную минуту по фактическому "
    "использованию. Используйте своего оператора телефонии.",
    "zh": "{plan}：每月包含 {minutes} 分钟 AI 语音智能体通话，超出部分按实际用量"
    "每分钟 {price} 计费。使用您自己的电话服务商。",
}

_TRIAL = {
    "en": " {days}-day free trial, cancel anytime.",
    "fr": " Essai gratuit de {days} jours, résiliable à tout moment.",
    "es": " Prueba gratuita de {days} días, cancela cuando quieras.",
    "de": " {days} Tage kostenlos testen, jederzeit kündbar.",
    "it": " Prova gratuita di {days} giorni, disdici quando vuoi.",
    "pt": " Teste grátis de {days} dias, cancele a qualquer momento.",
    "ru": " Бесплатный пробный период {days} дней, отмена в любой момент.",
    "zh": " 免费试用 {days} 天，可随时取消。",
}


def stripe_locale(app_locale: str | None) -> str:
    """Stripe locale for an app locale; unknown values let Stripe decide."""
    return STRIPE_LOCALES.get((app_locale or "").lower()[:2], "auto")


def _group(n: int, sep: str) -> str:
    return f"{n:,}".replace(",", sep)


def _price(minor: str, currency: str, locale: str) -> str:
    thousands, decimal, before = _NUMBER_STYLE[locale]
    amount = (Decimal(minor) / 100).quantize(Decimal("0.01"))
    text = f"{amount:f}".replace(".", decimal)
    symbol = _SYMBOLS.get(currency.lower(), currency.upper())
    return f"{symbol}{text}" if before else f"{text} {symbol}"


def offer_message(
    *,
    locale: str | None,
    plan_name: str,
    included_minutes: int,
    overage_per_minute: str | None,
    currency: str,
    trial_days: int,
) -> str | None:
    """One paragraph describing the plan, or None when nothing useful to say."""
    lang = (locale or "").lower()[:2]
    if lang not in _OFFER or not included_minutes or not overage_per_minute:
        return None
    thousands = _NUMBER_STYLE[lang][0]
    text = _OFFER[lang].format(
        plan=plan_name,
        minutes=_group(included_minutes, thousands),
        price=_price(overage_per_minute, currency, lang),
    )
    if trial_days > 0:
        text += _TRIAL[lang].format(days=trial_days)
    return text[:1200]
