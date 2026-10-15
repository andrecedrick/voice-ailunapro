# Voice AiLunaPro — the brand layer, and how to keep it

This fork tracks Dograh upstream. Every time we pull a new Dograh release, the
risk is the same one that cost us the design once already: an upstream file we
had edited comes back in its Dograh form, and the app silently reverts to
Dograh's look.

This document is the defence. It lists **everything** that makes this app Voice
AiLunaPro rather than Dograh, split into the part an upgrade cannot touch and
the short list it can.

`scripts/verify-brand.sh` checks this list mechanically. Run it after every
upgrade — the UI Docker build runs it too, so a build that lost the brand fails
instead of shipping.

---

## 1. Files that are OURS (upstream has no such path)

A `git merge upstream/main` can never conflict on these, and no Dograh release
can overwrite them. **This is where design work belongs.** When you want to
change how the app looks, change a file in this list first and reach for
section 2 only if there is no other way.

| Path | What it holds |
| --- | --- |
| `ui/src/styles/ailunapro.css` | The whole design: palette, glass surfaces, grid + halos canvas, sidebar dock, cards, tables, inputs, status pills, rails, typography. |
| `ui/src/components/brand/index.tsx` | Design primitives: `StatusPill`, `Rail`, `KpiTile`. |
| `ui/src/components/brand/AppTopbar.tsx`, `CommandPalette.tsx`, `LanguageMenu.tsx`, `nav.ts`, `theme.ts`, `PlanNotice.tsx` | The template's top bar, the ⌘K palette, the language picker, the shared nav map, the theme switch, and our plans notice on the billing page. |
| `ui/src/i18n/` | The language layer: 8 languages (en, fr, es, de, it, pt, ru, zh), **English by default**, choice kept in the `al_locale` cookie and read on the server so the first paint is already translated. Every dictionary is typed against `en.ts`, so a missing key fails the build. |
| `ui/src/app/icon.png`, `ui/src/app/apple-icon.png` | Favicon and home-screen icon (the sphere). |
| `ui/src/components/brand/SubscriptionPanel.tsx`, `ui/src/app/auth/verify/`, `ui/src/components/brand/Turnstile.tsx`, `ui/src/lib/ailunapro-api.ts` | Billing panel (plans from Stripe, 7-day trial, checkout, customer portal), email-confirmation page, Cloudflare Turnstile widget, typed calls to our endpoints. |
| `api/services/billing/plans.py` | Plan catalog read live from Stripe: every product named `AiLunaPro Voice — …` with one monthly price and one metered price. Doubles as the checkout allowlist. |
| `api/services/auth/email_verification.py`, `api/services/auth/signup_guard.py`, `api/services/email/` | Sign-up confirmation email (8 languages, signed 48 h link), bot protection (honeypot, fill timer, disposable domains, per-IP limits, Turnstile), SMTP mailer. |
| `api/alembic/versions/e3b81f6c2a57_add_user_email_verified_at.py` | Adds `users.email_verified_at` and marks every existing user verified. |
| `ui/public/ailunapro-logo.png` | Wordmark (violet→cyan gradient on transparency). |
| `ui/public/ailunapro-mark.png` | Square icon, 512px. |
| `ui/src/lib/productVersion.ts` | Our own version numbering, kept apart from Dograh's. |
| `ui/src/app/pricing/` | The public pricing page. |
| `ui/src/i18n/pricing/` | Pricing-page copy in the 8 languages (typed against `en.ts`). |
| `api/services/billing/`, `api/routes/billing_stripe.py`, `api/db/organization_billing_client.py` | The Stripe billing module. |
| `BRAND.md`, `scripts/verify-brand.sh` | This document and its check. |

### Why the design is a *layer*, not a set of ported screens

`ailunapro.css` restyles the app through the shadcn design tokens
(`--background`, `--card`, `--primary`, …) and the stable `data-slot` hooks the
shadcn primitives already emit. Nothing in it names a Dograh screen.

The consequence matters: **a screen Dograh adds in a future release arrives
already wearing our design.** Had we instead rewritten each page to match the
template, every Dograh release would have landed new pages in Dograh's look and
every upgrade would have been a merge fight. One file, no conflicts, full
coverage.

---

## 2. Upstream files we patch — the only things an upgrade can break

Each one is marked in the source with a `BRAND:` comment saying what it does and
why. If a merge brings back the upstream version, `verify-brand.sh` fails and
names the file.

| File | The patch | If it is lost |
| --- | --- | --- |
| `ui/src/app/layout.tsx` | `import "../styles/ailunapro.css"` **after** globals.css; Inter + Sora via next/font; `<I18nProvider>` + `<html lang>` from the cookie; translated description. | **The whole design reverts**, and every screen falls back to English. This is the critical file. |
| `api/routes/auth.py` | Sign-up runs the bot guard and sends the confirmation email; sign-in refuses unconfirmed addresses (`403 email_not_verified`) and is rate-limited; new `/auth/signup-config`, `/auth/verify-email`, `/auth/resend-verification`. | Anyone (and any bot) can sign up and call straight away. |
| `api/db/models.py`, `api/db/user_client.py` | `UserModel.email_verified_at` + `mark_user_email_verified`. | Sign-in crashes on the missing attribute. |
| `api/routes/organization_usage.py` | Daily breakdown no longer refuses orgs without per-second pricing (all of ours). | Overview KPIs show dashes forever. |
| `ui/src/app/pricing/page.tsx` | Plan buttons go to `/auth/signup?plan=…` instead of Stripe Payment Links. | Payment-Link subscriptions belong to no workspace and carry no overage price. |
| `ui/src/app/favicon.ico` | Replaced with the sphere icon. | Dograh's favicon returns in the browser tab. |
| `ui/src/app/billing/page.tsx` | In OSS mode: `<SubscriptionPanel />` (our plans, Stripe checkout and portal) replaces Dograh's credit cards and its "buy credits at app.dograh.com" notice. | **Revenue leak**: our customers are sent to buy from Dograh. |
| `ui/src/app/api-keys/page.tsx` | "Sign up on app.dograh.com" → contact support. | Same leak, smaller. |
| `ui/src/components/BrandLogo.tsx` | Points at `/ailunapro-*.png`; adds the `pill` prop. | Dograh logo returns (or 404s). |
| `ui/src/components/layout/AppSidebar.tsx` | Nav from `brand/nav.ts` with translated labels, logo + version chip, support link in place of "Hire an Expert". Upstream's "Update — Dograh x.y is out" / "Latest" badges removed: they told customers what we are built on. Release watching runs as André's daily scheduled task instead. | Dograh's nav, its services CTA and its update badge return. |
| `ui/src/components/layout/AppLayout.tsx` | Header replaced by `<AppTopbar />`. | Dograh's Slack invite and star badge return in the header. |
| `ui/src/components/layout/GitHubStarBadge.tsx` | Neutralised to `return null` (props kept). | "Star us on GitHub" returns in header **and** workflow editor. |
| `ui/src/components/lead-forms/HireExpertNudge.tsx` | Neutralised to `return null` (props kept). | Dograh's "Hire an Expert" pop-up returns in the builder. |
| `ui/src/components/auth/AuthShell.tsx` | Translated brand panel, language picker, floating sphere, glass card. | Dograh's open-source copy returns on the login page. |
| `ui/src/app/auth/login/LoginForm.tsx`, `ui/src/app/auth/signup/page.tsx`, `ui/src/components/auth/AuthEnterpriseCTA.tsx` | Copy read from the i18n dictionaries. | The first screen a customer sees stops following the language menu. |
| `ui/Dockerfile` | Runs `verify-brand.sh` before `next build`; blanks Dograh's Chatwoot workspace. | The brand check stops running, and Dograh's own support chat appears on our customers' screens. |
| `ui/src/components/Footer.tsx` | Legal links to ailunapro.com. | Links point at dograh.com — a legal problem, not a cosmetic one. |
| `ui/src/app/overview/page.tsx` | The dashboard, rebuilt from the template on real usage data. | Dograh's welcome page returns. |
| `ui/src/app/globals.css` | Untouched by us on purpose — `ailunapro.css` overrides it from `layout.tsx`. | — |
| `ui/src/middleware.ts`, `ui/src/components/layout/AppLayout.tsx` | `/pricing` is public. | The pricing page redirects to the login form. |
| `ui/src/lib/auth/providers/LocalProviderWrapper.tsx` | Logged-out visitors on `/pricing` and `/embed` are not sent to `/auth/login`. | Prospects see the login form instead of prices. |
| `ui/src/app/pricing/page.tsx` | Copy from `pricingCopy(locale)`, `LanguageMenu` in the header, transparent logo, competitor rows as published ranges with % below their typical cost. | Page reverts to English-only with single-number competitor prices. |

Two components are **neutralised rather than deleted**, with their props intact.
That is deliberate: if a Dograh release starts rendering the star badge or the
hire nudge on a *new* screen, that screen inherits our no-op. Deleting them
would have broken the build at every such call site instead.

---

## 3. Upgrade procedure

```bash
# 1. Bring in the new Dograh release
git fetch upstream
git merge upstream/main            # conflicts, if any, land only in section 2

# 2. Prove the brand survived
./scripts/verify-brand.sh          # fails loudly, naming whatever is missing

# 3. Move our own version forward
#    ui/src/lib/productVersion.ts  →  VOICE_VERSION

# 4. Catch the new upstream strings (section 6)
node scripts/i18n/extract-ui-strings.cjs   # then translate what is new

# 5. Look at it before shipping
cd ui && npm run build && npm run dev
```

If step 2 fails, do not ship. Re-apply the named patch from this table — the
`BRAND:` comment in the surrounding upstream code says what it was for.

---

## 4. Runtime configuration (in `/opt/dograh/.env`, never in Git)

| Variable | Effect when set |
| --- | --- |
| `STRIPE_SECRET_KEY` | Turns subscription billing on (plans, checkout, call gate). |
| `STRIPE_WEBHOOK_SECRET` | Lets `/api/v1/billing/stripe/webhook` accept Stripe events. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Turns on sign-up email confirmation. Unset = accounts are confirmed on the spot, as before. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Adds the Cloudflare challenge to sign-up. |
| `BILLING_EXEMPT_ORG_IDS` | Workspaces that call without a subscription (yours). |
| `ENABLE_TELEMETRY=false` | Keeps upstream's PostHog off on stacks run from the upstream compose file (ours defaults to off). |

Build-time (UI image): `NEXT_PUBLIC_DOCS_URL` sends documentation links to our
own docs instead of hiding them; `NEXT_PUBLIC_ONBOARDING_API_URL` is where lead
forms post (blank = our own `/api/v1/ailunapro/leads`, emailed to `LEADS_NOTIFY_EMAIL`).

## 5. What is deliberately NOT done

- **Documentation links are hidden, not rewritten.** There is no AiLunaPro
  docs site yet; set `NEXT_PUBLIC_DOCS_URL` once there is (section 6).
- **No dashboard figures are invented.** The template shipped with mock numbers
  (1,284 calls, 87.4% answer rate). The overview renders em dashes until the
  real usage endpoint answers, and the bar chart is drawn from
  `/api/v1/organizations/usage/daily-breakdown`.
- **The "dograh" provider identifier stays.** In
  `ui/src/components/model-connections/` it is a protocol value carried in API
  payloads, not a label. Renaming it would break the backend contract. The
  user-facing strings around it already say Voice AiLunaPro.

---

## 6. Whole-app translation and rebranding (DOM localizer)

Upstream screens are hard-coded English. Patching hundreds of upstream files
would make every upgrade a conflict, so the translation lives beside them:

| Piece | Role |
| --- | --- |
| `scripts/i18n/extract-ui-strings.cjs` | Reads `ui/src` (TypeScript AST) and writes every visible English text to `ui/src/i18n/catalog/source.json` — exact strings plus `{0}` patterns for template literals. |
| `ui/src/i18n/catalog/<locale>.json` | Translations of that source (fr, es, de, it, pt, ru, zh). Entries identical to English are not stored. |
| `ui/src/i18n/catalog/runtime.ts` | Lookup, `{0}` pattern filling, "Dograh" → "AiLunaPro", dograh.com link policy. Pure, unit-tested. |
| `ui/src/components/brand/DomLocalizer.tsx` | Mounted once in `app/layout.tsx`. Rewrites text nodes and `placeholder` / `title` / `aria-label` / `alt` after React renders, follows re-renders through a MutationObserver, restores English when the menu goes back to EN. Never touches `code`, `pre`, inputs, editors or `[data-no-translate]`. |

Rules it applies in every language: "Dograh" becomes "AiLunaPro" (also in API
error messages); links to `*.dograh.com` are hidden, or sent to
`NEXT_PUBLIC_DOCS_URL` for docs pages.

After an upstream merge: run the extractor, translate the strings that are new
in `source.json` (same glossary, keep `{0}`), commit. Untranslated strings
simply show in English — nothing breaks.

Other upstream patches made for the same request:

| File | Patch | If lost |
| --- | --- | --- |
| `ui/src/components/lead-forms/onboardingServiceClient.ts` | No default URL: upstream posts enterprise / expert / onboarding forms to `api-leads.dograh.com`. Without `NEXT_PUBLIC_ONBOARDING_API_URL` they go to our `POST /api/v1/ailunapro/leads` (`api/routes/ailunapro_leads.py`, OURS), which emails `LEADS_NOTIFY_EMAIL` (default service@ailunapro.com). | Prospects and new sign-ups' answers leave for a third party. |
| `docker-compose.yaml` | Telemetry off, no upstream PostHog key. | Usage of our customers is reported to Dograh's PostHog. |
| `api/services/quota_service.py` | Out-of-credit messages point to service@ailunapro.com. | Customers are told to buy on app.dograh.com. |
| `api/services/configuration/registry.py`, `api/services/organization_bootstrap.py` | Provider display name "AiLunaPro" (id stays `dograh`). | Providers page lists "Dograh". |
| `api/app.py` | OpenAPI title and server URL. | API docs say "Dograh API". |
| `api/routes/workflow_embed.py`, `ui/public/embed/dograh-widget.js`, `ui/next.config.ts`, `EmbedDialog.tsx`, `constants/embedExamples.ts` | Snippet loads `/embed/ailunapro-widget.js`, global `window.AiLunaProWidget`, `data-ailunapro-context`, `ailunapro-inline-container`. The old names keep working for embeds already live. | Customers paste a "Dograh" snippet on their site. |
| `ui/src/components/Footer.tsx`, `ui/public/licenses.txt` | Footer follows the language; "Open source" link to the BSD notices Dograh and Pipecat require. | Footer in French only; licence notice missing. |

