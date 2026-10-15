"""Lead and onboarding forms → an email to our sales inbox. OURS — see BRAND.md §6.

Upstream posts these forms (enterprise, hire-an-expert, post-signup onboarding)
to Dograh's own leads service, which would hand our prospects to a third party.
The UI now posts them here instead, and we forward them by email.
"""

import html
import json
import os
from typing import Any, Literal

from fastapi import APIRouter, Request
from loguru import logger
from pydantic import BaseModel, Field

from api.services.auth.signup_guard import enforce_rate_limit
from api.services.email import mailer

router = APIRouter(prefix="/ailunapro", tags=["ailunapro"])

LEADS_NOTIFY_EMAIL = os.getenv("LEADS_NOTIFY_EMAIL", "service@ailunapro.com")
_MAX_FIELDS = 40
_MAX_VALUE_CHARS = 2000

_SUBJECTS = {
    "enterprise": "Voice AiLunaPro — demande Entreprise",
    "hire_expert": "Voice AiLunaPro — demande d'expert",
    "onboarding": "Voice AiLunaPro — questionnaire d'onboarding",
}


class LeadIn(BaseModel):
    kind: Literal["enterprise", "hire_expert", "onboarding"]
    data: dict[str, Any] = Field(default_factory=dict)


class LeadOut(BaseModel):
    ok: bool
    show_calendar: bool = False
    cal_link: str | None = None


def _flatten(data: dict[str, Any]) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for key, value in list(data.items())[:_MAX_FIELDS]:
        if value is None or value == "" or value == []:
            continue
        text = (
            value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        )
        rows.append((str(key)[:80], text[:_MAX_VALUE_CHARS]))
    return rows


def render_lead_email(kind: str, data: dict[str, Any]) -> tuple[str, str, str]:
    """Subject, plain text and HTML for one submission (values escaped)."""
    rows = _flatten(data)
    subject = _SUBJECTS.get(kind, "Voice AiLunaPro — formulaire")
    email = next((v for k, v in rows if k.lower() in ("email", "work_email")), "")
    if email:
        subject = f"{subject} · {email}"
    text = "\n".join(f"{k}: {v}" for k, v in rows) or "(vide)"
    cells = "".join(
        f"<tr><td style='padding:4px 12px 4px 0;color:#64748b'>{html.escape(k)}</td>"
        f"<td style='padding:4px 0'>{html.escape(v)}</td></tr>"
        for k, v in rows
    )
    body = f"<table style='font:14px/1.5 sans-serif'>{cells}</table>"
    return subject, text, body


@router.post("/leads", response_model=LeadOut)
async def submit_lead(payload: LeadIn, request: Request) -> LeadOut:
    await enforce_rate_limit(request, "lead")
    if not mailer.is_configured():
        # Never log the content: it is personal data.
        logger.warning("Lead '{}' received but SMTP is not configured", payload.kind)
        return LeadOut(ok=False)
    subject, text, body = render_lead_email(payload.kind, payload.data)
    try:
        await mailer.send_email(
            to=LEADS_NOTIFY_EMAIL, subject=subject, text=text, html=body
        )
    except Exception as e:  # noqa: BLE001 — best effort, like upstream
        logger.warning(
            "Lead '{}' could not be emailed: {}", payload.kind, type(e).__name__
        )
        return LeadOut(ok=False)
    return LeadOut(ok=True)
