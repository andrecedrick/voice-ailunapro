"""Which currency to show a visitor, and in which ones Stripe can charge. OURS.

Stripe bills in another currency only when the plan's price carries a matching
entry in ``currency_options``. So the app never *converts* anything: it offers
exactly the currencies Stripe is configured for, and falls back to the price's
own currency. A visitor sees the amount that will actually be charged.
"""

from __future__ import annotations

# Country (ISO-3166 alpha-2) → currency. Only what we are likely to sell in;
# anything missing falls back to the plan's own currency.
COUNTRY_CURRENCY = {
    # Euro area
    **{c: "eur" for c in (
        "FR", "BE", "DE", "AT", "ES", "IT", "PT", "NL", "LU", "IE", "FI", "GR",
        "SK", "SI", "EE", "LV", "LT", "CY", "MT", "HR", "MC", "AD", "SM",
    )},
    # CFA franc zones price in EUR too (fixed peg, no local Stripe currency).
    **{c: "eur" for c in ("SN", "CI", "BJ", "BF", "ML", "NE", "TG", "CM", "GA", "CG", "TD", "CF")},
    "US": "usd", "EC": "usd", "SV": "usd", "PA": "usd",
    "GB": "gbp",
    "CA": "cad",
    "CH": "chf",
    "AU": "aud",
    "NZ": "nzd",
    "JP": "jpy",
    "SG": "sgd",
    "AE": "aed",
    "MA": "mad",
    "TN": "tnd",
    "SE": "sek",
    "NO": "nok",
    "DK": "dkk",
    "PL": "pln",
    "CZ": "czk",
    "RO": "ron",
    "BR": "brl",
    "MX": "mxn",
    "IN": "inr",
    "ZA": "zar",
}

# Headers a reverse proxy or CDN may set, best first.
_COUNTRY_HEADERS = (
    "cf-ipcountry",            # Cloudflare
    "x-vercel-ip-country",
    "x-geo-country",
    "x-country-code",
    "x-appengine-country",
)


def country_from_headers(headers) -> str | None:
    """The visitor's country as our edge reported it, or None."""
    for name in _COUNTRY_HEADERS:
        value = (headers.get(name) or "").strip().upper()
        if len(value) == 2 and value.isalpha() and value not in ("XX", "T1"):
            return value
    return None


def currency_for_country(country: str | None) -> str | None:
    return COUNTRY_CURRENCY.get((country or "").upper())


def pick_currency(
    *, requested: str | None, country: str | None, available: set[str], default: str
) -> str:
    """Honour an explicit choice, else geography, else the plan's own currency."""
    for candidate in (requested, currency_for_country(country)):
        code = (candidate or "").strip().lower()
        if code and code in available:
            return code
    return default


def price_in(price: dict, currency: str) -> tuple[int, str] | None:
    """(unit amount, currency) for a Stripe price in `currency`, if offered."""
    currency = currency.lower()
    if (price.get("currency") or "").lower() == currency:
        return int(price.get("unit_amount") or 0), currency
    option = (price.get("currency_options") or {}).get(currency)
    if option and option.get("unit_amount") is not None:
        return int(option["unit_amount"]), currency
    return None


def currencies_of(price: dict) -> set[str]:
    """Every currency this price can be charged in."""
    out = {(price.get("currency") or "").lower()}
    out.update(k.lower() for k in (price.get("currency_options") or {}))
    return {c for c in out if c}


def tiers_in(price: dict, currency: str) -> list[dict] | None:
    """Graduated tiers for `currency` (overage), or None when not offered."""
    currency = currency.lower()
    if (price.get("currency") or "").lower() == currency:
        return price.get("tiers")
    option = (price.get("currency_options") or {}).get(currency)
    return option.get("tiers") if option else None
