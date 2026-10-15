"use client";

import {
    AudioLines,
    Brain,
    Clock,
    KeyRound,
    LifeBuoy,
    Map as MapIcon,
    Megaphone,
    Phone,
    PhoneCall,
    Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet } from "@/client";
import type { DailyUsageItem } from "@/client/types.gen";
import { KpiTile, Rail, StatusPill } from "@/components/brand";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfig } from "@/context/AppConfigContext";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth";

const DAYS = 7;

/**
 * Overview — the Voice AiLunaPro dashboard.
 *
 * BRAND: rewritten from the AiLunaPro_Voice_Dashboard template. The template's
 * figures were mock data; every number here comes from the real usage endpoint,
 * and the tiles render em dashes rather than zeros until it answers, so the page
 * never shows a made-up metric.
 */
export default function OverviewPage() {
    const { user, provider, loading: authLoading } = useAuth();
    const { config } = useAppConfig();
    const { t, tag } = useI18n();
    const o = t.overview;
    const isOSSMode = provider !== "stack";

    const [breakdown, setBreakdown] = useState<DailyUsageItem[] | null>(null);
    const [usageFailed, setUsageFailed] = useState(false);
    const hasFetched = useRef(false);

    // The auth interceptor that attaches the bearer token is only registered
    // once auth has finished loading — fetching earlier sends an anonymous
    // request that fails silently. See ui/AGENTS.md.
    useEffect(() => {
        if (authLoading || !user || hasFetched.current) return;
        hasFetched.current = true;

        (async () => {
            try {
                const response = await getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet({
                    query: { days: DAYS },
                });
                // The generated client resolves rather than throws on 4xx/5xx.
                if (response.error || !response.data) {
                    setUsageFailed(true);
                    return;
                }
                setBreakdown(response.data.breakdown ?? []);
            } catch {
                // Network failure. The tiles stay blank; nothing else on the
                // page depends on this call.
                setUsageFailed(true);
            }
        })();
    }, [authLoading, user]);

    const days = breakdown ?? [];
    const today = days.length > 0 ? days[days.length - 1] : null;
    const callsToday = today?.call_count ?? null;
    const minutesWeek = days.reduce((sum, d) => sum + (d.minutes ?? 0), 0);
    const callsWeek = days.reduce((sum, d) => sum + (d.call_count ?? 0), 0);
    const peak = days.reduce((max, d) => Math.max(max, d.call_count ?? 0), 0);

    const known = breakdown !== null;
    const blank = "—";
    const fmt = (n: number, digits = 0) =>
        n.toLocaleString(tag, { maximumFractionDigits: digits });

    const firstName = user?.displayName ? user.displayName.split(" ")[0] : null;

    return (
        <PageLayout
            title={firstName ? o.welcomeNamed(firstName) : o.welcome}
            description={o.subtitle}
            actions={
                <StatusPill tone={config?.backendStatus === "reachable" ? "active" : "paused"}>
                    {config?.backendStatus === "reachable"
                        ? o.statusOk
                        : o.statusDown}
                </StatusPill>
            }
        >
            {/* KPIs — real usage over the last 7 days. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiTile
                    icon={PhoneCall}
                    label={o.kpiCallsToday}
                    value={known && callsToday !== null ? fmt(callsToday) : blank}
                    hint={o.kpiCallsTodayHint}
                />
                <KpiTile
                    icon={Clock}
                    label={o.kpiMinutes}
                    value={known ? `${fmt(minutesWeek, 1)} ${o.minutesUnit}` : blank}
                    hint={o.overDays(DAYS)}
                />
                <KpiTile
                    icon={AudioLines}
                    label={o.kpiCalls}
                    value={known ? fmt(callsWeek) : blank}
                    hint={o.overDays(DAYS)}
                />
                <KpiTile
                    icon={Phone}
                    label={o.kpiPeak}
                    value={known ? fmt(peak) : blank}
                    hint={o.kpiPeakHint}
                />
            </div>

            {usageFailed && (
                <p className="text-sm text-muted-foreground">
                    {o.usageUnavailable}
                </p>
            )}

            {/* 7-day activity, drawn from the same breakdown. Bars are scaled to
                the busiest day so a quiet week still reads. */}
            {known && days.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{o.recent}</CardTitle>
                        <CardDescription>{o.recentSub(DAYS)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2" style={{ height: "9rem" }}>
                            {days.map((d, index) => {
                                const pct = peak > 0 ? ((d.call_count ?? 0) / peak) * 100 : 0;
                                const label = new Date(d.date).toLocaleDateString(tag, {
                                    weekday: "short",
                                });
                                return (
                                    <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                        <div className="flex w-full flex-1 items-end">
                                            <div
                                                className="al-bar w-full"
                                                style={{
                                                    height: `${Math.max(pct, 2)}%`,
                                                    animationDelay: `${index * 60}ms`,
                                                }}
                                                title={o.barTitle(d.call_count, d.minutes.toFixed(1))}
                                            />
                                        </div>
                                        <span className="truncate text-xs text-muted-foreground">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <Rail
                                value={peak > 0 ? ((callsToday ?? 0) / peak) * 100 : 0}
                                label={o.railLabel}
                                className="mr-4 flex-1"
                            />
                            <Button asChild variant="outline" size="sm">
                                <Link href="/usage">{t.common.viewAll}</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick actions. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{o.agentsTitle}</CardTitle>
                        <CardDescription>
                            {o.agentsDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/workflow">
                                <Workflow className="h-4 w-4" />
                                {o.agentsCta}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{o.servicesTitle}</CardTitle>
                        <CardDescription>
                            {o.servicesDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <Link href="/model-configurations">
                                <Brain className="h-4 w-4" />
                                {o.servicesCta}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Shortcuts into the rest of the product. */}
            <Card>
                <CardHeader>
                    <CardTitle>{o.resources}</CardTitle>
                    <CardDescription>{o.resourcesSub}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { href: "/campaigns", icon: Megaphone, title: t.nav.campaigns, desc: o.resCampaigns },
                            { href: "/telephony-configurations", icon: Phone, title: t.nav.telephony, desc: o.resTelephony },
                            { href: "/api-keys", icon: KeyRound, title: t.nav.developers, desc: o.resDevelopers },
                            { href: "/pricing", icon: MapIcon, title: t.nav.pricing, desc: o.resPricing },
                        ].map(({ href, icon: Icon, title, desc }) => (
                            <Link
                                key={href}
                                href={href}
                                className="card-weave flex flex-col gap-1.5 border p-4 transition-colors"
                            >
                                <Icon className="h-4 w-4 text-[color:var(--al-accent)]" />
                                <span className="font-medium">{title}</span>
                                <span className="text-sm text-muted-foreground">{desc}</span>
                            </Link>
                        ))}
                    </div>

                    {isOSSMode && (
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <LifeBuoy className="h-4 w-4 shrink-0" />
                            <span>{o.question}</span>
                            <a
                                className="font-medium text-[color:var(--al-accent)] hover:underline"
                                href="mailto:service@ailunapro.com"
                            >
                                service@ailunapro.com
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageLayout>
    );
}
