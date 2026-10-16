/**
 * App navigation map. OURS — see BRAND.md.
 *
 * One list feeds the sidebar, the top-bar breadcrumb and the command palette,
 * so a screen added here shows up in all three. Labels are i18n keys into
 * `t.nav`; the urls are upstream Dograh's routes and must follow them.
 */
import {
  AudioLines,
  Brain,
  CircleDollarSign,
  Database,
  FileText,
  Gift,
  Home,
  Key,
  type LucideIcon,
  Megaphone,
  Phone,
  Plug,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Wrench,
} from "lucide-react";

import type { Dict } from "@/i18n/dictionaries";

export type NavKey = keyof Dict["nav"];

export type NavItem = {
  key: NavKey;
  url: string;
  icon: LucideIcon;
  showsTelephonyWarning?: boolean;
};

export type NavSection = {
  label?: NavKey;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ key: "overview", url: "/overview", icon: Home }],
  },
  {
    label: "build",
    items: [
      { key: "agents", url: "/workflow", icon: Workflow },
      { key: "providers", url: "/provider-connections", icon: Plug },
      { key: "models", url: "/model-configurations", icon: Brain },
      { key: "telephony", url: "/telephony-configurations", icon: Phone, showsTelephonyWarning: true },
      { key: "tools", url: "/tools", icon: Wrench },
      { key: "credentials", url: "/credentials", icon: ShieldCheck },
      { key: "files", url: "/files", icon: Database },
      { key: "campaigns", url: "/campaigns", icon: Megaphone },
      { key: "recordings", url: "/recordings", icon: AudioLines },
      { key: "developers", url: "/api-keys", icon: Key },
    ],
  },
  {
    label: "manage",
    items: [
      { key: "runs", url: "/usage", icon: TrendingUp },
      { key: "billing", url: "/billing", icon: CircleDollarSign },
      { key: "reports", url: "/reports", icon: FileText },
      { key: "partners", url: "/partners", icon: Gift },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Longest-prefix match, so /workflow/12/runs resolves to "Voice agents". */
export function navItemFor(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.url.length - a.url.length)
    .find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`));
}
