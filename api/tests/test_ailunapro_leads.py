"""Lead forms reach our inbox, not Dograh's leads service. See BRAND.md §6."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import ailunapro_leads
from api.routes.ailunapro_leads import render_lead_email


def _app(monkeypatch, *, smtp: bool):
    monkeypatch.setattr(ailunapro_leads, "enforce_rate_limit", AsyncMock())
    monkeypatch.setattr(ailunapro_leads.mailer, "is_configured", lambda: smtp)
    send = AsyncMock()
    monkeypatch.setattr(ailunapro_leads.mailer, "send_email", send)
    app = FastAPI()
    app.include_router(ailunapro_leads.router, prefix="/api/v1")
    return TestClient(app), send


def test_lead_is_emailed_to_sales(monkeypatch):
    client, send = _app(monkeypatch, smtp=True)
    res = client.post(
        "/api/v1/ailunapro/leads",
        json={
            "kind": "enterprise",
            "data": {"email": "ceo@acme.test", "company": "Acme"},
        },
    )
    assert res.status_code == 200 and res.json()["ok"] is True
    kwargs = send.await_args.kwargs
    assert kwargs["to"] == ailunapro_leads.LEADS_NOTIFY_EMAIL
    assert "ceo@acme.test" in kwargs["subject"]
    assert "Acme" in kwargs["text"]


def test_without_smtp_nothing_is_sent(monkeypatch):
    client, send = _app(monkeypatch, smtp=False)
    res = client.post(
        "/api/v1/ailunapro/leads", json={"kind": "onboarding", "data": {"role": "CEO"}}
    )
    assert res.status_code == 200 and res.json()["ok"] is False
    send.assert_not_awaited()


def test_unknown_kind_is_rejected(monkeypatch):
    client, _ = _app(monkeypatch, smtp=True)
    assert (
        client.post(
            "/api/v1/ailunapro/leads", json={"kind": "spam", "data": {}}
        ).status_code
        == 422
    )


@pytest.mark.parametrize("payload", ["<script>alert(1)</script>", "a&b"])
def test_values_are_escaped_in_html(payload):
    _, _, body = render_lead_email("enterprise", {"note": payload})
    assert payload not in body
