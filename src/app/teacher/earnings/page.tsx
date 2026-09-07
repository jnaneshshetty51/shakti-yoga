"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuWallet, LuCalendarDays, LuMessageSquare, LuUsers } from "react-icons/lu";
import { PageHeader, PageLoading, Card, CardHeader, EmptyState, ErrorState, Badge } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { CHART_SECONDARY } from "@/components/admin/Sparkline";

interface Earnings {
    generatedAt: string;
    rates: { class: number; session: number };
    months: { key: string; label: string; classes: number; sessions: number; payout: number }[];
    totals: {
        classes: number; sessions: number; payout: number;
        thisMonthPayout: number; lastMonthPayout: number; windowDays: number;
    };
    roster: {
        id: string; name: string; email: string; plan: string;
        classes: number; sessions: number; lastSeen: string | null;
    }[];
}

const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const inrShort = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

function ago(iso: string | null) {
    if (!iso) return "—";
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function TeacherEarningsPage() {
    const [data, setData] = useState<Earnings | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const res = await fetch("/api/teacher/earnings", { signal: ac.signal, cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            setData((await res.json()) as Earnings);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            setError("Could not load your earnings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, [load]);

    if (loading && !data) return <PageLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={load} />;
    if (!data) return null;

    const { totals, rates } = data;
    const delta = totals.lastMonthPayout > 0
        ? Math.round(((totals.thisMonthPayout - totals.lastMonthPayout) / totals.lastMonthPayout) * 100)
        : null;

    return (
        <div>
            <PageHeader
                title="Earnings & Roster"
                subtitle={`Estimated from completed classes (${inr(rates.class)} each) and 1:1 sessions (${inr(rates.session)} each). Admin sets the rates.`}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="This month (est.)"
                    value={inr(totals.thisMonthPayout)}
                    icon={<LuWallet />}
                    accent="green"
                    change={delta !== null ? `${delta > 0 ? "+" : ""}${delta}% vs last month` : undefined}
                    changeType={delta !== null && delta < 0 ? "negative" : "positive"}
                    trend={delta !== null ? (delta < 0 ? "down" : "up") : undefined}
                />
                <StatCard title="Last 6 months (est.)" value={inr(totals.payout)} icon={<LuWallet />} accent="terracotta" spark={data.months.map((m) => m.payout)} />
                <StatCard title="Classes completed" value={totals.classes} icon={<LuCalendarDays />} accent="blue" />
                <StatCard title="Sessions completed" value={totals.sessions} icon={<LuMessageSquare />} accent="amber" />
            </div>

            <Card className="mb-8">
                <CardHeader title="Monthly payout estimate" subtitle="Completed classes + sessions × rate, last 6 months" />
                <div className="p-5 sm:p-6">
                    {data.months.some((m) => m.payout > 0) ? (
                        <TrendChart
                            series={data.months.map((m) => ({ label: m.label, value: m.payout }))}
                            kind="bar"
                            color={CHART_SECONDARY}
                            format={inrShort}
                        />
                    ) : (
                        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                            No completed classes or sessions in the last 6 months.
                        </div>
                    )}
                </div>
            </Card>

            <Card className="overflow-hidden">
                <CardHeader title="Your roster" subtitle={`${data.roster.length} member${data.roster.length === 1 ? "" : "s"} you've taught`} />
                {data.roster.length === 0 ? (
                    <EmptyState icon={LuUsers} title="No students yet" hint="Members show here once they attend your class or book a session." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3 text-right">Classes</th>
                                    <th className="px-4 py-3 text-right">Sessions</th>
                                    <th className="px-4 py-3 text-right">Last seen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.roster.map((r) => (
                                    <tr key={r.id} className="text-gray-600">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{r.name}</div>
                                            <div className="text-xs text-gray-400">{r.email}</div>
                                        </td>
                                        <td className="px-4 py-3"><Badge tone="gray" className="capitalize">{r.plan}</Badge></td>
                                        <td className="px-4 py-3 text-right tabular-nums">{r.classes}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{r.sessions}</td>
                                        <td className="px-4 py-3 text-right text-gray-400">{ago(r.lastSeen)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
