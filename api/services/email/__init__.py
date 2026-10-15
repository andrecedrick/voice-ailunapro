"""Outgoing email for Voice AiLunaPro (sign-up confirmation)."""

from api.services.email.mailer import is_configured, send_email

__all__ = ["is_configured", "send_email"]
