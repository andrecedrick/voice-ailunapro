"""One light, deliverable HTML shell for every Voice AiLunaPro email. OURS.

Mail clients are a hostile target: no flexbox, no external stylesheets, and
Outlook still renders through Word. So this is tables, inline styles and
web-safe fonts only.

Deliverability drives most of the choices here, because a confirmation link
that lands in spam costs a sign-up:

- **Light surface.** The wordmark is violet on white; on a dark card it loses
  contrast, and Gmail's and Outlook's forced dark modes recolour hand-made dark
  palettes unpredictably. ``color-scheme: light`` pins it.
- **Text carries the message.** One image, the logo, with alt text styled like
  the wordmark. Every message reads completely with images switched off, which
  is how a cautious client shows a first email.
- **600px, no background images, no web fonts, no script, no form.** The shapes
  filters expect from legitimate mail.
- **A text/plain twin for every send** (see ``plain``). HTML-only mail is one
  of the strongest spam signals there is.
- **One link per message, on our own domain.** No redirector, no tracking
  rewrite: a security link that passes through a third party is what
  anti-phishing filters are built to catch.
- **A postal address in the footer** when ``EMAIL_POSTAL_ADDRESS`` is set.
  Required of commercial mail in most of the markets we sell into, and its
  absence is itself scored.

Kept deliberately absent: List-Unsubscribe (these are transactional messages
nobody may opt out of and still use the product), exclamation marks, and
all-caps subjects.
"""

from __future__ import annotations

import html as html_lib
import os
from dataclasses import dataclass

BRAND = "AiLunaPro Voice"
SUPPORT = "service@ailunapro.com"
SITE = "https://voice.ailunapro.com"
LOGO = f"{SITE}/ailunapro-logo.png"
LOGO_WIDTH = 170  # of a 475x79 wordmark
# Postal address shown in the footer. Left empty until a real one is set - an
# invented address is worse than none.
POSTAL = os.getenv("EMAIL_POSTAL_ADDRESS", "").strip()

_INK = "#0B1024"  # headings
_BODY = "#3B4560"  # paragraphs
_MUTED = "#6B7487"  # captions, footer
_ACCENT = "#6D28D9"  # links, eyebrow
_CARD = "#FFFFFF"
_PAGE = "#EEF1F7"
_LINE = "#E4E9F2"
_FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


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
    """Build the HTML body of one email."""
    head = _e(heading)
    body_html = "".join(
        f'<p style="margin:0 0 16px;font-family:{_FONT};font-size:16px;'
        f'line-height:1.65;color:{_BODY}">{_e(p)}</p>'
        for p in paragraphs
    )

    cta = ""
    if button:
        # Solid violet, white label: a gradient that fails to render leaves a
        # readable button rather than white-on-white.
        cta = f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px">
<tr><td align="center" bgcolor="{_ACCENT}" style="border-radius:10px;background-color:{_ACCENT};background-image:linear-gradient(135deg,#7C3AED,#4F46E5)">
<a href="{_e(button.url)}" style="display:inline-block;padding:14px 30px;font-family:{_FONT};font-size:16px;font-weight:600;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:10px">{_e(button.label)}</a>
</td></tr></table>"""
        if show_raw_link:
            cta += (
                f'<p style="margin:16px 0 0;font-family:{_FONT};font-size:13px;'
                f'line-height:1.6;color:{_MUTED}">'
                f'<span style="color:{_MUTED}">{_e(button.url)}</span></p>'
            )

    facts_html = ""
    if facts:
        rows = "".join(
            f'<tr>'
            f'<td style="padding:9px 0;border-bottom:1px solid {_LINE};font-family:{_FONT};font-size:14px;color:{_MUTED}">{_e(k)}</td>'
            f'<td align="right" style="padding:9px 0;border-bottom:1px solid {_LINE};font-family:{_FONT};font-size:14px;font-weight:600;color:{_INK}">{_e(v)}</td>'
            f'</tr>'
            for k, v in facts
        )
        facts_html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'border="0" style="margin:10px 0 2px;border-top:1px solid {_LINE}">{rows}</table>'
        )

    note_html = ""
    if note:
        note_html = f"""
<tr><td style="padding:0 36px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:14px 16px;border-radius:10px;background-color:#F6F4FF;border:1px solid #E7E0FB">
<p style="margin:0;font-family:{_FONT};font-size:13px;line-height:1.6;color:{_MUTED}">{_e(note)}</p>
</td></tr></table>
</td></tr>"""

    # Gmail shows the first text it finds next to the subject. Give it a chosen
    # sentence, then pad so the body does not leak into the preview.
    hidden = ""
    if preheader:
        hidden = (
            '<div style="display:none;font-size:1px;line-height:1px;max-height:0;'
            'max-width:0;opacity:0;overflow:hidden;mso-hide:all">'
            f"{_e(preheader)}"
            + "&#847;&zwnj;&nbsp;" * 60
            + "</div>"
        )

    postal = (
        f'<p style="margin:6px 0 0;font-family:{_FONT};font-size:11px;line-height:1.6;color:#98A0B0">{_e(POSTAL)}</p>'
        if POSTAL
        else ""
    )
    tail = (
        f'<p style="margin:6px 0 0;font-family:{_FONT};font-size:11px;line-height:1.6;color:#98A0B0">{_e(footer_note)}</p>'
        if footer_note
        else ""
    )

    return f"""<!doctype html>
<html lang="{_e(locale)}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{head}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root {{ color-scheme: light; supported-color-schemes: light; }}
  body, table, td, p, a {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
  img {{ -ms-interpolation-mode:bicubic; }}
  a {{ color:{_ACCENT}; }}
  @media only screen and (max-width:620px) {{
    .al-card {{ width:100% !important; }}
    .al-pad {{ padding-left:24px !important; padding-right:24px !important; }}
    .al-shell {{ padding:20px 10px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background-color:{_PAGE};font-family:{_FONT};color:{_INK}">
{hidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{_PAGE}">
<tr><td align="center" class="al-shell" style="padding:36px 16px">

<table role="presentation" class="al-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:{_CARD};border:1px solid {_LINE};border-radius:16px">

<tr><td class="al-pad" style="padding:34px 36px 0">
<a href="{SITE}" style="text-decoration:none;border:0">
<img src="{LOGO}" width="{LOGO_WIDTH}" alt="{BRAND}" style="display:block;width:{LOGO_WIDTH}px;max-width:62%;height:auto;border:0;outline:none;text-decoration:none;font-family:{_FONT};font-size:20px;font-weight:700;color:{_ACCENT}">
</a>
</td></tr>

<tr><td class="al-pad" style="padding:24px 36px 0">
<h1 style="margin:0 0 14px;font-family:{_FONT};font-size:24px;line-height:1.3;font-weight:700;color:{_INK}">{head}</h1>
{body_html}
{facts_html}
{cta}
</td></tr>

<tr><td class="al-pad" style="padding:28px 36px 0">
<div style="height:1px;line-height:1px;font-size:0;background-color:{_LINE}">&nbsp;</div>
</td></tr>
{note_html or '<tr><td style="padding:0 0 26px"></td></tr>'}
</table>

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
<tr><td align="center" style="padding:18px 16px 0">
<p style="margin:0;font-family:{_FONT};font-size:12px;line-height:1.7;color:#98A0B0">
{BRAND} &middot; <a href="mailto:{SUPPORT}" style="color:#7A8294;text-decoration:none">{SUPPORT}</a>
</p>
{postal}
{tail}
</td></tr></table>

</td></tr></table>
</body></html>"""


def plain(
    *,
    heading: str,
    paragraphs: list[str],
    link: str | None = None,
    facts: list[tuple[str, str]] | None = None,
    note: str | None = None,
) -> str:
    """The text/plain twin of `render`. Never skip it: HTML-only mail is one of
    the strongest spam signals, and some clients show nothing without it."""
    out = [heading, ""]
    out += list(paragraphs)
    if facts:
        out.append("")
        out += [f"{k}: {v}" for k, v in facts]
    if link:
        out += ["", link]
    if note:
        out += ["", note]
    out += ["", f"— {BRAND} · {SUPPORT}"]
    if POSTAL:
        out.append(POSTAL)
    return "\n".join(out)
