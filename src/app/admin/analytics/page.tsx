"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { CHART_PRIMARY, CHART_SECONDARY } from "@/components/admin/Sparkline";

type Series = { label: string; value: number }[];

interface Analytics {
    range: string;
    generatedAt: string;
    activeMembers: number;
    everydayMembers: number;
    therapyMembers: number;
    trialUsers: number;
    mrr: number;
    newMembers: number;
    newMembersDelta: number | null;
    revenueCollected: number;
    revenueDelta: number | null;
    conversionRate: number;
    classFill: { rate: number; avgAttendees: number; classes: number; eligible: number };
    revenueSeries: Series;
    signupSeries: Series;
    trialFunnel: {
        requested: number; scheduled: number; attended: number;
        converted: number; noShow: number; conversionRate: number;
    };
    membersByPlan: { plan: string; count: number }[];
    membersByCountry: { country: string; count: number }[];
}

const RANGES = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "12m", label: "Last 12 months" },
];

const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const inrShort = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

function chip(delta: number | null): { change?: string; changeType: "positive" | "negative" | "neutral"; trend?: "up" | "down" } {
    if (delta === null) return { change: "no prior data", changeType: "neutral" };
    if (delta === 0) return { change: "no change", changeType: "neutral" };
    return {
        change: `${delta > 0 ? "+" : ""}${delta}% vs prev period`,
        changeType: delta > 0 ? "positive" : "negative",
        trend: delta > 0 ? "up" : "down",
    };
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function HBars({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div className="space-y-3">
            {rows.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
            {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-24 truncate">{r.label}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: CHART_PRIMARY }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right tabular-nums">
                        {r.count}{total > 0 && <span className="text-gray-400 text-xs"> · {Math.round((r.count / total) * 100)}%</span>}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [range, setRange] = useState("30d");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics?range=${range}`, { signal: ac.signal, cache: "no-store" });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            setData((await res.json()) as Analytics);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            setError("Could not load analytics.");
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, [load]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-gray-500 mt-1">Business performance and growth</p>
                </div>
                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">{error}</p>
                    <button onClick={load} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Retry</button>
                </div>
            )}

            {loading && !data ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse h-28 bg-gray-200 rounded-xl" />)}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Monthly Revenue" value={inr(data.mrr)} />
                        <StatCard
                            title="Revenue Collected"
                            value={inr(data.revenueCollected)}
                            {...chip(data.revenueDelta)}
                            spark={data.revenueSeries.map((p) => p.value)}
                        />
                        <StatCard
                            title="New Members"
                            value={data.newMembers}
                            {...chip(data.newMembersDelta)}
                            spark={data.signupSeries.map((p) => p.value)}
                        />
                        <StatCard
                            title="Active Members"
                            value={data.activeMembers}
                            change={`${data.everydayMembers} everyday · ${data.therapyMembers} therapy`}
                            changeType="neutral"
                        />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                            <Card title="Revenue" subtitle="Collected payments over the selected range">
                                {data.revenueSeries.some((p) => p.value > 0) ? (
                                    <TrendChart series={data.revenueSeries} kind="bar" color={CHART_SECONDARY} format={inrShort} />
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                                        No payments recorded in this range.
                                    </div>
                                )}
                            </Card>
                        </div>
                        <Card title="Members by Plan" subtitle="Active subscriptions">
                            <HBars
                                rows={data.membersByPlan.map((p) => ({ label: p.plan, count: p.count }))}
                                total={data.membersByPlan.reduce((s, p) => s + p.count, 0)}
                            />
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                            <Card title="Signups" subtitle="New accounts over the selected range">
                                {data.signupSeries.some((p) => p.value > 0) ? (
                                    <TrendChart series={data.signupSeries} kind="area" color={CHART_PRIMARY} />
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No signups in this range.</div>
                                )}
                            </Card>
                        </div>
                        <Card title="Members by Location" subtitle="Top countries">
                            <HBars
                                rows={data.membersByCountry.map((c) => ({ label: c.country, count: c.count }))}
                                total={data.membersByCountry.reduce((s, c) => s + c.count, 0)}
                            />
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card title="Trial Funnel" subtitle="Trial requests → conversions in this range">
                            <div className="flex items-stretch gap-2 mb-3">
                                {[
                                    { label: "Requested", v: data.trialFunnel.requested },
                                    { label: "Scheduled", v: data.trialFunnel.scheduled },
                                    { label: "Attended", v: data.trialFunnel.attended },
                                    { label: "Converted", v: data.trialFunnel.converted },
                                ].map((s, i) => (
                                    <div key={s.label} className="flex-1 text-center">
                                        <div className="rounded-lg py-3 text-white font-bold text-lg" style={{ background: CHART_PRIMARY, opacity: 1 - i * 0.18 }}>
                                            {s.v}
                                        </div>
                                        <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{data.trialFunnel.noShow} no-shows</span>
                                <span className="font-bold text-gray-700">{data.trialFunnel.conversionRate}% conversion</span>
                            </div>
                        </Card>

                        <Card title="Class Attendance" subtitle="Group classes in this range">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Avg attendees / class", value: data.classFill.avgAttendees },
                                    { label: "Classes held", value: data.classFill.classes },
                                    { label: "Fill rate vs eligible", value: `${data.classFill.rate}%` },
                                    { label: "Eligible members", value: data.classFill.eligible },
                                ].map((s) => (
                                    <div key={s.label}>
                                        <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </>
            ) : null}
        </div>
    );
}
