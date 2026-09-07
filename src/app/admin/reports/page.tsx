"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuIndianRupee, LuUserPlus, LuUsers, LuRepeat, LuDownload } from "react-icons/lu";
import { PageHeader, PageLoading, Card, CardHeader, ErrorState, Badge } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { CHART_PRIMARY, CHART_SECONDARY } from "@/components/admin/Sparkline";

type Series = { label: string; value: number }[];

interface Reports {
    generatedAt: string;
    revenueByMonth: Series;
    signupsByMonth: Series;
    retention: { label: string; joined: number; retained: number; rate: number | null }[];
    planMix: { plan: string; active: number; total: number }[];
    summary: {
        totalRevenue: number;
        totalSignups: number;
        overallRetention: number | null;
        liveSubscriptions: number;
    };
}

const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const inrShort = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

const EXPORTS = [
    { type: "payments", label: "Payments" },
    { type: "members", label: "Members" },
    { type: "subscriptions", label: "Subscriptions" },
    { type: "bookings", label: "Bookings" },
] as const;

export default function AdminReportsPage() {
    const [data, setData] = useState<Reports | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const res = await fetch("/api/admin/reports", { signal: ac.signal, cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            setData((await res.json()) as Reports);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            setError("Could not load reports.");
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

    const { summary } = data;

    return (
        <div>
            <PageHeader title="Reports" subtitle="Trailing 12 months. Download raw data as CSV for finance and analysis." />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard title="Revenue (12m)" value={inr(summary.totalRevenue)} icon={<LuIndianRupee />} accent="green" spark={data.revenueByMonth.map((p) => p.value)} />
                <StatCard title="Signups (12m)" value={summary.totalSignups} icon={<LuUserPlus />} accent="blue" spark={data.signupsByMonth.map((p) => p.value)} />
                <StatCard title="Live subscriptions" value={summary.liveSubscriptions} icon={<LuUsers />} accent="terracotta" />
                <StatCard
                    title="Overall retention"
                    value={summary.overallRetention === null ? "—" : `${summary.overallRetention}%`}
                    icon={<LuRepeat />}
                    accent="amber"
                    change="joiners still subscribed"
                    changeType="neutral"
                />
            </div>

            <Card className="mb-6">
                <CardHeader title="Downloads" subtitle="Up to 5,000 most-recent rows per report" />
                <div className="p-5 sm:p-6 flex flex-wrap gap-2">
                    {EXPORTS.map((e) => (
                        <a
                            key={e.type}
                            href={`/api/admin/reports/export?type=${e.type}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <LuDownload className="text-sm" /> {e.label} CSV
                        </a>
                    ))}
                </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader title="Revenue by month" subtitle="Collected payments" />
                    <div className="p-5 sm:p-6">
                        {data.revenueByMonth.some((p) => p.value > 0) ? (
                            <TrendChart series={data.revenueByMonth} kind="bar" color={CHART_SECONDARY} format={inrShort} />
                        ) : (
                            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No revenue recorded.</div>
                        )}
                    </div>
                </Card>
                <Card>
                    <CardHeader title="Signups by month" subtitle="New member & trial accounts" />
                    <div className="p-5 sm:p-6">
                        {data.signupsByMonth.some((p) => p.value > 0) ? (
                            <TrendChart series={data.signupsByMonth} kind="area" color={CHART_PRIMARY} format={(v) => String(Math.round(v))} />
                        ) : (
                            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No signups recorded.</div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                    <CardHeader title="Cohort retention" subtitle="Of members who joined that month, how many still hold a live subscription" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Cohort</th>
                                    <th className="px-4 py-3 text-right">Joined</th>
                                    <th className="px-4 py-3 text-right">Retained</th>
                                    <th className="px-4 py-3 text-right">Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.retention.map((r) => (
                                    <tr key={r.label} className="text-gray-600">
                                        <td className="px-4 py-2.5">{r.label}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{r.joined}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{r.retained}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            {r.rate === null ? <span className="text-gray-300">—</span> : (
                                                <Badge tone={r.rate >= 60 ? "green" : r.rate >= 30 ? "amber" : "red"}>{r.rate}%</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader title="Plan mix" subtitle="Subscriptions by plan" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3 text-right">Active</th>
                                    <th className="px-4 py-3 text-right">All-time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.planMix.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No subscriptions yet.</td></tr>
                                ) : data.planMix.map((p) => (
                                    <tr key={p.plan} className="text-gray-600">
                                        <td className="px-4 py-2.5 capitalize">{p.plan}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">{p.active}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{p.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
