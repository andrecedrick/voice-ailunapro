"""Founders offer (public) and influencer programme. OURS — see growth.py."""

import html

from fastapi import APIRouter, HTTPException, Request
from loguru import logger
from pydantic import BaseModel, EmailStr, Field

from api.constants import UI_APP_URL
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
