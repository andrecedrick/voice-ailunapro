"""One premium HTML shell for every Voice AiLunaPro transactional email. OURS.

Mail clients are a hostile target: no flexbox, no external stylesheets, and
Outlook still renders through Word. So this is tables, inline styles and web
safe fallbacks only - the gradients degrade to a flat brand colour rather than
to nothing, and the whole card sits on its own dark background so it reads the
same in a light inbox as in a dark one.

Every message in the product goes through `render`, so there is one place to
change the look and one place that gets the escaping right.
"""

from __future__ import annotations

import html as html_lib
from dataclasses import dataclass

BRAND = "AiLunaPro Voice"
SUPPORT = "service@ailunapro.com"
SITE = "https://voice.ailunapro.com"

# Mail clients that drop background-clip fall back to this flat cyan.
_ACCENT = "#22D3EE"
_INK = "#070912"
_CARD = "#0E1530"
_TEXT = "#F4F7FF"
_BODY = "#A9B1C7"
_DIM = "#6F7893"


@dataclass
class Button:
    label: str
    url: str


def _e(value: str) -> str:
    return html_lib.escape(value or "")


def render(
    *,
    locale: str,
    heading: str,
    paragraphs: list[str],
    button: Button | None = None,
    show_raw_link: bool = True,
    facts: list[tuple[str, str]] | None = None,
    note: str | None = None,
    preheader: str | None = None,
    footer_note: str | None = None,
) -> str:
    """Build the HTML body of one email.

    `facts` renders a small label/value table - used by the partner emails,
    where the figures matter more than the prose. `note` is the quiet line at
    the bottom (what to do if this was not you). `preheader` is the sentence
    the inbox shows next to the subject; it is hidden inside the message.
    """
    head = _e(heading)
    body_html = "".join(
        f'<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:{_BODY}">{_e(p)}</p>'
        for p in paragraphs
    )

    cta = ""
    if button:
        cta = f"""
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 4px">
<tr><td style="border-radius:12px;background:{_ACCENT};background-image:linear-gradient(120deg,#22D3EE,#7DE9F7 45%,#A78BFA)">
<a href="{_e(button.url)}" style="display:inline-block;padding:14px 26px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700;color:#05131A;text-decoration:none;border-radius:12px">{_e(button.label)}</a>
</td></tr></table>"""
        if show_raw_link:
            # Some clients strip the button; the bare URL is the safety net.
            cta += (
                f'<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:{_DIM};'
                f'word-break:break-all">{_e(button.url)}</p>'
            )

    facts_html = ""
    if facts:
        rows = "".join(
            f'<tr><td style="padding:7px 0;font-size:13px;color:{_DIM}">{_e(k)}</td>'
            f'<td align="right" style="padding:7px 0;font-size:13px;font-weight:600;color:{_TEXT}">{_e(v)}</td></tr>'
            for k, v in facts
        )
        facts_html = f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-top:1px solid rgba(140,160,255,.14);border-bottom:1px solid rgba(140,160,255,.14)">
{rows}
</table>"""

    note_html = ""
    if note:
        note_html = f"""
<tr><td style="padding:0 32px 30px">
<div style="padding:14px 16px;border-radius:12px;background:rgba(140,160,255,.06);border:1px solid rgba(140,160,255,.12)">
<p style="margin:0;font-size:12.5px;line-height:1.6;color:{_DIM}">{_e(note)}</p>
</div>
</td></tr>"""

    hidden = ""
    if preheader:
        hidden = (
            '<div style="display:none;max-height:0;overflow:hidden;opacity:0;'
            f'mso-hide:all">{_e(preheader)}</div>'
        )

    tail = (
        f'<p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#4F5872">{_e(footer_note)}</p>'
        if footer_note
        else ""
    )

    return f"""<!doctype html>
<html lang="{_e(locale)}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>{head}</title>
<style>
  @media only screen and (max-width:600px) {{
    .al-pad {{ padding-left:22px !important; padding-right:22px !important; }}
    .al-shell {{ padding:22px 12px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{_INK};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:{_TEXT}">
{hidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_INK}">
<tr><td align="center" class="al-shell" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:{_CARD};border:1px solid rgba(140,160,255,.16);border-radius:20px">

<tr><td class="al-pad" style="padding:34px 32px 0">
<a href="{SITE}" style="text-decoration:none">
<span style="font-size:19px;font-weight:800;letter-spacing:-.01em;color:{_ACCENT};background:linear-gradient(90deg,#8B5CF6,#22D3EE);-webkit-background-clip:text;background-clip:text">{BRAND}</span>
</a>
</td></tr>

<tr><td class="al-pad" style="padding:22px 32px 0">
<h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;font-weight:700;color:{_TEXT}">{head}</h1>
{body_html}
{facts_html}
{cta}
</td></tr>

<tr><td class="al-pad" style="padding:28px 32px 0">
<div style="height:1px;background:rgba(140,160,255,.14)"></div>
</td></tr>
{note_html or '<tr><td style="padding:0 0 24px"></td></tr>'}
</table>

<p style="margin:18px 0 0;font-size:11px;line-height:1.7;color:#4F5872">
{BRAND} · <a href="mailto:{SUPPORT}" style="color:#5B6684;text-decoration:none">{SUPPORT}</a>
</p>
{tail}
</td></tr></table></body></html>"""


def plain(
    *,
    heading: str,
    paragraphs: list[str],
    link: str | None = None,
    facts: list[tuple[str, str]] | None = None,
    note: str | None = None,
) -> str:
    """The text/plain twin of `render`. Never skip it: a message sent as HTML
    only lands in spam far more often, and some clients show nothing at all."""
    out = [heading, ""]
    out += [p for p in paragraphs]
    if facts:
        out.append("")
        out += [f"{k}: {v}" for k, v in facts]
    if link:
        out += ["", link]
    if note:
        out += ["", note]
    out += ["", f"— {BRAND} · {SUPPORT}"]
    return "\n".join(out)
