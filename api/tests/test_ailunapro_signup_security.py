"""Voice AiLunaPro: sign-up bot protection and email-confirmation tokens."""

import time

import jwt

from api.constants import OSS_JWT_SECRET
from api.services.auth import email_verification as ev
from api.services.auth import signup_guard as sg


def test_honeypot_and_fill_time_flag_bots():
    now = int(time.time() * 1000)
    assert sg.looks_like_bot(honeypot="http://spam", started_at_ms=None)
    assert sg.looks_like_bot(honeypot=None, started_at_ms=now - 500)
    assert not sg.looks_like_bot(honeypot=None, started_at_ms=now - 8000)
    # Browser clock ahead of the server is skew, not a bot.
    assert not sg.looks_like_bot(honeypot=None, started_at_ms=now + 60_000)


def test_disposable_domains_and_subdomains_are_refused():
    assert sg.is_disposable("x@yopmail.com")
    assert sg.is_disposable("x@mx.mailinator.com")
    assert not sg.is_disposable("andre@ailunapro.com")


def test_verification_token_round_trip():
    token = ev.create_verification_token(42, "A@B.com")
    assert ev.read_verification_token(token) == (42, "a@b.com")


def test_sign_in_token_cannot_confirm_an_address():
    login_like = jwt.encode(
        {"sub": "42", "email": "a@b.com", "exp": int(time.time()) + 60},
        OSS_JWT_SECRET,
        algorithm="HS256",
    )
    assert ev.read_verification_token(login_like) is None


def test_expired_or_tampered_tokens_are_refused():
    expired = jwt.encode(
        {"sub": "42", "email": "a@b.com", "purpose": "verify_email", "exp": int(time.time()) - 5},
        OSS_JWT_SECRET,
        algorithm="HS256",
    )
    assert ev.read_verification_token(expired) is None
    assert ev.read_verification_token(ev.create_verification_token(1, "a@b.com") + "x") is None


def test_email_renders_in_requested_language_with_fallback():
    subject, text, html = ev._render("fr", "https://voice.example/auth/verify?token=abc")
    assert subject.startswith("Confirmez")
    assert "https://voice.example/auth/verify?token=abc" in text
    assert "<script" not in html
    assert ev._render("xx", "l")[0].startswith("Confirm your")
