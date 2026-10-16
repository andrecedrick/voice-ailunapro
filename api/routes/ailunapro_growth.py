"""Founders offer (public) and influencer programme. OURS — see growth.py."""

import html

from fastapi import APIRouter, HTTPException, Request
from loguru import logger
from pydantic import BaseModel, EmailStr, Field

from api.constants import UI_APP_URL
from api.routes.ailunapro_leads import LEADS_NOTIFY_EMAIL
from api.services.auth.signup_guard import enforce_rate_limit
from api.services.billing import growth, is_enabled
from api.services.email import mailer

router = APIRouter(prefix="/ailunapro", tags=["ailunapro"])


@router.get("/founders")
async def get_founders_offer() -> dict:
    """Live state of the founders offer, for the pricing banner."""
    if not is_enabled():
        return growth.state_dict(growth.founder_state(growth.FOUNDER_SEATS))
    try:
        return growth.state_dict(await growth.current_founder_state())
    except Exception as e:  # noqa: BLE001
        logger.warning("Founders state unavailable: {}", type(e).__name__)
        raise HTTPException(status_code=424, detail="founders_unavailable")


@router.get("/partners/terms")
async def partner_terms() -> dict:
    """Public programme terms, for the partners landing page."""
    return growth.programme_terms()


class PartnerIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    handle: str = Field(min_length=2, max_length=40)


class PartnerOut(BaseModel):
    code: str
    dashboard_url: str
    share_url: str
    percent_off: int
    first_pct: int
    recurring_pct: int
    months: int


def _links(code: str) -> tuple[str, str]:
    base = UI_APP_URL.rstrip("/")
    token = growth.partner_token(code)
    return (
        f"{base}/partners/dashboard?code={code}&token={token}",
        f"{base}/auth/signup?ref={code}",
    )


@router.post("/partners", response_model=PartnerOut)
async def create_partner(payload: PartnerIn, request: Request) -> PartnerOut:
    """Influencer sign-up: creates LUNA-<HANDLE> and emails the dashboard link."""
    await enforce_rate_limit(request, "lead")
    if not is_enabled():
        raise HTTPException(status_code=503, detail="billing_disabled")
    try:
        promo = await growth.create_partner(
            name=payload.name, email=str(payload.email), handle=payload.handle
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:  # noqa: BLE001
        from api.services.billing import stripe_error_message

        reason = stripe_error_message(e)
        logger.error("Partner creation failed: {}", reason)
        # Same reason the browser gets, so a failure is diagnosable without
        # server logs. Keys are redacted by stripe_error_message.
        raise HTTPException(status_code=424, detail=f"Stripe: {reason}")

    code = promo["code"]
    dashboard, share = _links(code)
    if mailer.is_configured():
        try:
            await mailer.send_email(
                to=str(payload.email),
                subject=f"Voice AiLunaPro — votre code partenaire {code}",
                text=(
                    f"Code : {code}\nLien à partager : {share}\n"
                    f"Votre tableau de bord : {dashboard}\n"
                ),
                html=(
                    f"<p>Code : <b>{html.escape(code)}</b></p>"
                    f"<p>Lien à partager : <a href='{html.escape(share)}'>{html.escape(share)}</a></p>"
                    f"<p>Tableau de bord : <a href='{html.escape(dashboard)}'>ouvrir</a></p>"
                ),
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Partner email not sent: {}", type(e).__name__)
    return PartnerOut(
        code=code, dashboard_url=dashboard, share_url=share, **growth.programme_terms()
    )


class PayoutRequestOut(BaseModel):
    ok: bool
    amount_cents: int


@router.post("/partners/{code}/payout", response_model=PayoutRequestOut)
async def request_payout(code: str, token: str, request: Request) -> PayoutRequestOut:
    """A partner asks to be paid. Nothing is transferred: this emails us the
    figures so the payout is checked and sent by hand."""
    await enforce_rate_limit(request, "lead")
    code = code.upper()
    if not growth.check_partner_token(code, token):
        raise HTTPException(status_code=403, detail="invalid_token")
    promo = await growth.find_promotion_code(code)
    if not promo:
        raise HTTPException(status_code=404, detail="unknown_code")
    meta = promo.get("metadata") or {}
    stats = await growth.partner_stats(promo["id"], code)
    amount = int(stats["commission_cents"])
    if not mailer.is_configured():
        raise HTTPException(status_code=503, detail="email_unavailable")
    lines = [
        f"Code : {code}",
        f"Partenaire : {meta.get('name') or '—'} <{meta.get('email') or '—'}>",
        f"Inscriptions : {stats['signups']}",
        f"Clients actifs : {stats['active']} (dont {stats['earning']} rémunérés)",
        f"Revenu mensuel généré : {stats['mrr_cents'] / 100:.2f} EUR",
        f"Commission demandée : {amount / 100:.2f} EUR",
        "",
        "Rien n'a été transféré. Vérifier puis payer manuellement.",
    ]
    text = "\n".join(lines)
    try:
        await mailer.send_email(
            to=LEADS_NOTIFY_EMAIL,
            subject=f"Demande de paiement partenaire {code} — {amount / 100:.2f} EUR",
            text=text,
            html="<pre style=\"font:14px/1.5 monospace\">" + html.escape(text) + "</pre>",
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("Payout request not emailed: {}", type(e).__name__)
        raise HTTPException(status_code=424, detail="email_failed")
    return PayoutRequestOut(ok=True, amount_cents=amount)


@router.get("/partners/{code}/stats")
async def partner_stats(code: str, token: str) -> dict:
    code = code.upper()
    if not growth.check_partner_token(code, token):
        raise HTTPException(status_code=403, detail="invalid_token")
    promo = await growth.find_promotion_code(code)
    if not promo:
        raise HTTPException(status_code=404, detail="unknown_code")
    stats = await growth.partner_stats(promo["id"], code)
    return {
        "code": code,
        "name": (promo.get("metadata") or {}).get("name"),
        "percent_off": growth.PARTNER_PERCENT_OFF,
        **stats,
    }
