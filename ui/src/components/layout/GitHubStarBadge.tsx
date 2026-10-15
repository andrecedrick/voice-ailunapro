"use client";

interface GitHubStarBadgeProps {
  className?: string;
  label?: string;
  showCount?: boolean;
  source: string;
}

/**
 * BRAND: neutralised.
 *
 * Upstream renders a "Star us on GitHub" badge for the dograh-hq/dograh repo in
 * the app header, the workflow editor header and (previously) the overview page.
 * Voice AiLunaPro is a commercial product and does not solicit stars for a
 * third-party repository.
 *
 * The component is kept rather than deleted, with its props intact, so every
 * upstream call site keeps compiling: a Dograh release that adds the badge to a
 * new screen inherits this no-op instead of reintroducing the badge. See BRAND.md.
 */
/* eslint-disable unused-imports/no-unused-vars, @typescript-eslint/no-unused-vars */
export function GitHubStarBadge(_props: GitHubStarBadgeProps) {
  return null;
}
