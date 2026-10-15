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
| `ui/public/ailunapro-logo.png` | Wordmark (violet→cyan gradient on transparency). |
| `ui/public/ailunapro-mark.png` | Square icon, 512px. |
| `ui/src/lib/productVersion.ts` | Our own version numbering, kept apart from Dograh's. |
| `ui/src/app/pricing/` | The public pricing page. |
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
| `ui/src/app/favicon.ico` | Replaced with the sphere icon. | Dograh's favicon returns in the browser tab. |
| `ui/src/app/billing/page.tsx` | Upstream's "buy credits at app.dograh.com" notice replaced by `<PlanNotice />`. | **Revenue leak**: our customers are sent to buy from Dograh. |
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

# 4. Look at it before shipping
cd ui && npm run build && npm run dev
```

If step 2 fails, do not ship. Re-apply the named patch from this table — the
`BRAND:` comment in the surrounding upstream code says what it was for.

---

## 4. What is deliberately NOT done

- **Only the shell is translated.** Sidebar, top bar, command palette,
  overview, sign-in, sign-up and the billing notice follow the language menu.
  Deeper Dograh screens (workflow editor, telephony forms, …) stay in English,
  which is also the default, so a visitor who never touches the menu sees one
  language everywhere. Extending a screen means moving its strings into
  `src/i18n/dictionaries/*` — and every such screen is another upstream file
  to patch, so do it screen by screen, where customers actually spend time.
- **Documentation links still point at docs.dograh.com** on several deep
  screens (tools, files, telephony, recordings, settings). There is no
  AiLunaPro docs site to point them at yet.
- **No dashboard figures are invented.** The template shipped with mock numbers
  (1,284 calls, 87.4% answer rate). The overview renders em dashes until the
  real usage endpoint answers, and the bar chart is drawn from
  `/api/v1/organizations/usage/daily-breakdown`.
- **The "dograh" provider identifier stays.** In
  `ui/src/components/model-connections/` it is a protocol value carried in API
  payloads, not a label. Renaming it would break the backend contract. The
  user-facing strings around it already say Voice AiLunaPro.
