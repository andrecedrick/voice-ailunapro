"use client";

interface HireExpertNudgeProps {
  workflowId: number;
}

/**
 * BRAND: neutralised.
 *
 * Upstream pops a "Hire an Expert" nudge after five minutes in the workflow
 * builder, which routes the user to Dograh's own services. Voice AiLunaPro sells
 * that work itself, so the nudge does not run here.
 *
 * Kept as a no-op with its props intact so upstream call sites keep compiling
 * across merges. See BRAND.md.
 */
/* eslint-disable unused-imports/no-unused-vars, @typescript-eslint/no-unused-vars */
export function HireExpertNudge(_props: HireExpertNudgeProps) {
  return null;
}
