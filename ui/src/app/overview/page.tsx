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
        n.toLocaleString(undefined, { maximumFractionDigits: digits });

    const firstName = user?.displayName ? user.displayName.split(" ")[0] : null;

    return (
        <PageLayout
            title={firstName ? `Bienvenue, ${firstName}` : "Bienvenue sur Voice AiLunaPro"}
            description="Créez, lancez et pilotez vos agents vocaux IA."
            actions={
                <StatusPill tone={config?.backendStatus === "reachable" ? "active" : "paused"}>
                    {config?.backendStatus === "reachable"
                        ? "Tous les systèmes opérationnels"
                        : "Service indisponible"}
                </StatusPill>
            }
        >
            {/* KPIs — real usage over the last 7 days. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiTile
                    icon={PhoneCall}
                    label="Appels aujourd'hui"
                    value={known && callsToday !== null ? fmt(callsToday) : blank}
                    hint="dernier jour relevé"
                />
                <KpiTile
                    icon={Clock}
                    label="Minutes consommées"
                    value={known ? `${fmt(minutesWeek, 1)} min` : blank}
                    hint={`sur ${DAYS} jours`}
                />
                <KpiTile
                    icon={AudioLines}
                    label="Appels traités"
                    value={known ? fmt(callsWeek) : blank}
                    hint={`sur ${DAYS} jours`}
                />
                <KpiTile
                    icon={Phone}
                    label="Pic journalier"
                    value={known ? fmt(peak) : blank}
                    hint="appels / jour"
                />
            </div>

            {usageFailed && (
                <p className="text-sm text-muted-foreground">
                    Les indicateurs d&apos;usage ne sont pas disponibles pour le moment.
                </p>
            )}

            {/* 7-day activity, drawn from the same breakdown. Bars are scaled to
                the busiest day so a quiet week still reads. */}
            {known && days.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Activité récente</CardTitle>
                        <CardDescription>Appels sur les {DAYS} derniers jours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2" style={{ height: "9rem" }}>
                            {days.map((d) => {
                                const pct = peak > 0 ? ((d.call_count ?? 0) / peak) * 100 : 0;
                                const label = new Date(d.date).toLocaleDateString(undefined, {
                                    weekday: "short",
                                });
                                return (
                                    <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                        <div className="flex w-full flex-1 items-end">
                                            <div
                                                className="w-full rounded-t-md"
                                                style={{
                                                    height: `${Math.max(pct, 2)}%`,
                                                    background:
                                                        "linear-gradient(180deg, var(--al-cyan), var(--al-violet))",
                                                }}
                                                title={`${d.call_count} appels · ${d.minutes.toFixed(1)} min`}
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
                                label="Appels aujourd'hui par rapport au pic de la semaine"
                                className="mr-4 flex-1"
                            />
                            <Button asChild variant="outline" size="sm">
                                <Link href="/usage">Tout voir</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick actions. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Créez et gérez vos agents vocaux</CardTitle>
                        <CardDescription>
                            Concevez vos agents dans l&apos;éditeur visuel : script, voix, outils et
                            transferts vers vos équipes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/workflow">
                                <Workflow className="h-4 w-4" />
                                Aller aux agents
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Configurez vos services</CardTitle>
                        <CardDescription>
                            Connectez vos fournisseurs LLM, TTS et STT, puis choisissez le meilleur
                            modèle pour chaque agent.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <Link href="/model-configurations">
                                <Brain className="h-4 w-4" />
                                Configurer les modèles
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Shortcuts into the rest of the product. */}
            <Card>
                <CardHeader>
                    <CardTitle>Ressources</CardTitle>
                    <CardDescription>Tout pour aller plus loin avec Voice AiLunaPro.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { href: "/campaigns", icon: Megaphone, title: "Campagnes", desc: "Appels sortants automatisés" },
                            { href: "/telephony-configurations", icon: Phone, title: "Téléphonie", desc: "Numéros et trunks SIP" },
                            { href: "/api-keys", icon: KeyRound, title: "Développeurs", desc: "Clés API, webhooks et MCP" },
                            { href: "/pricing", icon: MapIcon, title: "Tarifs", desc: "Plans et minutes incluses" },
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
                            <span>Une question ?</span>
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
