/**
 * Voice AiLunaPro design primitives.
 *
 * OURS — upstream Dograh has no src/components/brand/, so nothing here can
 * conflict on a merge. These are the small pieces the dashboard template is
 * built from: a status pill, a progress rail, a KPI tile. Pages compose them;
 * the styling lives in src/styles/ailunapro.css.
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
   Status pill
   ------------------------------------------------------------------------- */

/** Status colours, taken from the template's `ST` table. */
const STATUS_TONE = {
  live: ["#22D3EE", "rgba(34,211,238,.14)", true],
  running: ["#22D3EE", "rgba(34,211,238,.14)", true],
  active: ["#34D399", "rgba(52,211,153,.12)", true],
  online: ["#34D399", "rgba(52,211,153,.12)", true],
  done: ["#34D399", "rgba(52,211,153,.12)", false],
  completed: ["#34D399", "rgba(52,211,153,.12)", false],
  transfer: ["#A78BFA", "rgba(139,92,246,.14)", false],
  scheduled: ["#A78BFA", "rgba(139,92,246,.14)", false],
  paused: ["#FBBF24", "rgba(251,191,36,.12)", false],
  voicemail: ["#FBBF24", "rgba(251,191,36,.12)", false],
  missed: ["#F87171", "rgba(248,113,113,.12)", false],
  failed: ["#F87171", "rgba(248,113,113,.12)", false],
  draft: ["#8A93AD", "rgba(138,147,173,.14)", false],
} as const satisfies Record<string, readonly [string, string, boolean]>;

export type StatusTone = keyof typeof STATUS_TONE;

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const [fg, bg, pulse] = STATUS_TONE[tone];
  return (
    <span
      className={cn("al-status", className)}
      data-pulse={pulse}
      style={
        { "--al-st-fg": fg, "--al-st-bg": bg } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Progress rail
   ------------------------------------------------------------------------- */

export function Rail({
  value,
  label,
  className,
}: {
  /** 0–100. Values outside the range are clamped, so a quota overrun still renders. */
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("al-rail", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   KPI tile
   ------------------------------------------------------------------------- */

export function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  /** Rendered as given, e.g. "+12.4%". Positive/negative tone is read from the leading sign. */
  trend?: string;
}) {
  const trendTone = trend?.startsWith("-") || trend?.startsWith("−")
    ? "text-[color:var(--al-rose)]"
    : "text-[color:var(--al-ok)]";

  return (
    <div className="card-weave flex flex-col gap-3 border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="al-display text-2xl font-semibold leading-none">{value}</div>
      {(trend || hint) && (
        <div className="flex items-baseline gap-2 text-xs">
          {trend && <span className={cn("font-semibold", trendTone)}>{trend}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
