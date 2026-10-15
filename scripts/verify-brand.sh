#!/usr/bin/env bash
# =============================================================================
# verify-brand.sh — fail if a Dograh upgrade has eaten the Voice AiLunaPro design
# =============================================================================
#
# We tracked this fork's design away once already: an upstream release came back
# with its own versions of files we had edited, and the app silently reverted to
# Dograh's look. Nothing about that failure was visible until someone opened the
# site.
#
# This script makes it visible. It asserts that every brand file still exists
# and that every patch listed in BRAND.md is still in place. It is cheap, it
# needs no node_modules, and the UI Docker build runs it before `next build`, so
# an image that lost the brand never gets built.
#
#   ./scripts/verify-brand.sh          # from the repo root, after every upgrade
#
# Exit 0 = the brand is intact. Exit 1 = it is not, and the output says which
# patch to re-apply. BRAND.md explains each one.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

# Paths are written below as `ui/src/...`, the repo layout. Inside the UI Docker
# builder the frontend is unpacked at the WORKDIR root instead (src/, public/),
# so strip the prefix there and the same check runs in both places.
UI="ui/"
[ -d ui/src ] || { [ -d src ] && UI=""; }
ui() { printf '%s%s' "$UI" "$1"; }

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
[ -t 1 ] || { RED=""; GREEN=""; YELLOW=""; DIM=""; OFF=""; }

failures=0

# exists <path> <why it matters>
exists() {
  if [ -e "$1" ]; then
    printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"
  else
    printf '  %s✗ MISSING%s %s\n      %s%s%s\n' "$RED" "$OFF" "$1" "$DIM" "$2" "$OFF"
    failures=$((failures + 1))
  fi
}

# contains <path> <fixed string> <why it matters>
contains() {
  if [ ! -e "$1" ]; then
    printf '  %s✗ MISSING FILE%s %s\n' "$RED" "$OFF" "$1"
    failures=$((failures + 1))
    return
  fi
  if grep -qF -- "$2" "$1"; then
    printf '  %s✓%s %s %s(%s)%s\n' "$GREEN" "$OFF" "$1" "$DIM" "$2" "$OFF"
  else
    printf '  %s✗ PATCH LOST%s %s\n      expected to find: %s\n      %s%s%s\n' \
      "$RED" "$OFF" "$1" "$2" "$DIM" "$3" "$OFF"
    failures=$((failures + 1))
  fi
}

# absent <path> <fixed string> <why it matters>
#
# Lines carrying a "BRAND:" comment are skipped: those comments name the Dograh
# thing they removed ("upstream puts a 'Hire an Expert' CTA here"), and without
# this filter the script would flag its own documentation as a regression.
absent() {
  [ -e "$1" ] || return 0
  if grep -vF 'BRAND:' "$1" | grep -qF -- "$2"; then
    printf '  %s✗ DOGRAH CHROME BACK%s %s\n      found: %s\n      %s%s%s\n' \
      "$RED" "$OFF" "$1" "$2" "$DIM" "$3" "$OFF"
    failures=$((failures + 1))
  else
    printf '  %s✓%s %s %sno "%s"%s\n' "$GREEN" "$OFF" "$1" "$DIM" "$2" "$OFF"
  fi
}

echo
echo "Voice AiLunaPro — brand check"
echo "============================="
echo
echo "1. Our own files (an upgrade cannot conflict on these)"
exists "$(ui src/styles/ailunapro.css)"        "The entire design layer. Without it the app is Dograh."
exists "$(ui src/components/brand/index.tsx)"  "StatusPill / Rail / KpiTile, used by the overview."
exists "$(ui public/ailunapro-logo.png)"       "Wordmark."
exists "$(ui public/ailunapro-mark.png)"       "Square icon."
exists "$(ui src/lib/productVersion.ts)"       "Our version numbering, separate from Dograh's."
exists "$(ui src/app/pricing/page.tsx)"        "Public pricing page."
exists "$(ui src/i18n/config.ts)"            "Language list and English default."
exists "$(ui src/i18n/dictionaries/en.ts)"   "Reference dictionary; every language is typed against it."
exists "$(ui src/components/brand/AppTopbar.tsx)" "Template top bar: breadcrumb, ⌘K, language, theme, New agent."
exists "$(ui src/components/brand/LanguageMenu.tsx)" "Language picker."
exists "$(ui src/app/icon.png)"              "Favicon (PNG)."
exists "$(ui src/app/apple-icon.png)"        "Home-screen icon."
exists "$(ui src/components/brand/SubscriptionPanel.tsx)" "Plans, trial and Stripe checkout on the billing page."
exists "$(ui src/app/auth/verify/page.tsx)"   "Email-confirmation landing page."
exists "$(ui src/lib/ailunapro-api.ts)"        "Typed calls to our auth and billing endpoints."
exists BRAND.md                           "The manifest this script checks."

echo
echo "2. Patches inside upstream files (an upgrade CAN revert these)"
contains "$(ui src/app/layout.tsx)" '../styles/ailunapro.css' \
  "THE critical line. It must come after globals.css. Lose it and the whole design reverts."
contains "$(ui src/app/layout.tsx)" '--font-sora' \
  "Display face. The headings fall back to the body font without it."
contains "$(ui src/components/BrandLogo.tsx)" '/ailunapro-logo.png' \
  "Logo source. Reverting points it at a dograh-*.png that no longer exists."
contains "$(ui src/components/layout/AppSidebar.tsx)" 'components/brand/nav' \
  "Sidebar reads the shared nav map and translated labels."
contains "$(ui src/components/layout/AppSidebar.tsx)" 'al-version-chip' \
  "Version chip beside the logo."
contains "$(ui src/components/Footer.tsx)" 'ailunapro.com' \
  "Legal links. Pointing these at dograh.com is a legal problem, not a cosmetic one."
contains "$(ui src/middleware.ts)" "'/pricing'" \
  "Keeps the pricing page public; without it, visitors get the login form."
contains "$(ui src/app/overview/page.tsx)" 'KpiTile' \
  "The dashboard rebuilt from the template."
contains "$(ui src/app/layout.tsx)" 'I18nProvider' \
  "Language provider. Without it every screen falls back to English and the menu does nothing."
contains "$(ui src/components/layout/AppLayout.tsx)" 'AppTopbar' \
  "Template top bar in place of upstream's Slack/GitHub header."
contains "$(ui src/app/billing/page.tsx)" 'SubscriptionPanel' \
  "Our plans on the billing page instead of 'buy credits at app.dograh.com'."
contains "$(ui src/app/auth/login/LoginForm.tsx)" 'useI18n' \
  "Translated sign-in form — the first screen a customer sees."
contains "$(ui src/app/auth/signup/page.tsx)" 'useI18n' \
  "Translated sign-up form."
contains "$(ui src/components/auth/AuthShell.tsx)" 'LanguageMenu' \
  "Translated auth panel with its language picker."

echo
echo "3. Dograh chrome that must stay gone"
absent "$(ui src/components/layout/AppLayout.tsx)" 'join.slack.com' \
  "Dograh's Slack invite is back in the app header."
absent "$(ui src/components/layout/GitHubStarBadge.tsx)" 'api.github.com/repos/dograh-hq' \
  "The 'Star us on GitHub' badge is back in the header and the workflow editor."
absent "$(ui src/components/layout/AppSidebar.tsx)" 'Hire an Expert' \
  "Dograh's services CTA is back in the sidebar."
absent "$(ui src/components/Footer.tsx)" 'dograh.com' \
  "Legal links point at dograh.com."
absent "$(ui src/components/auth/AuthEnterpriseCTA.tsx)" 'Enterprise Enquiry' \
  "Hard-coded CTA is back on the auth panel."
contains "$(ui src/middleware.ts)" "'/auth/verify'" \
  "Email-confirmation links must open without a session."
contains "$(ui src/app/auth/signup/page.tsx)" 'started_at' \
  "Bot protection on sign-up (honeypot + fill timer + Turnstile)."
absent "$(ui src/app/pricing/page.tsx)" 'buy.stripe.com' \
  "Pricing page links straight to Stripe Payment Links again: those subscriptions bind to no workspace."
absent "$(ui src/app/billing/page.tsx)" 'app.dograh.com' \
  "Billing page sends OUR customers to buy credits from Dograh."
absent "$(ui src/app/api-keys/page.tsx)" 'app.dograh.com' \
  "Developers page sends customers to sign up at Dograh."
absent "$(ui src/components/layout/AppSidebar.tsx)" 'useLatestReleaseVersion' \
  "The 'Dograh x.y is out' badge is back in front of customers."

echo
if [ "$failures" -eq 0 ]; then
  printf '%sBrand intact.%s\n\n' "$GREEN" "$OFF"
  exit 0
fi

printf '%s%d brand check(s) failed.%s\n' "$RED" "$failures" "$OFF"
printf '%sRe-apply the patches named above — BRAND.md section 2 explains each one.%s\n' "$YELLOW" "$OFF"
printf '%sIn the source, each patch sits under a "BRAND:" comment saying what it is for.%s\n\n' "$YELLOW" "$OFF"
exit 1
