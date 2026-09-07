"use client";

import { useCallback, useEffect, useState } from "react";
import { LuFlame, LuAward, LuHeart, LuMessageSquare } from "react-icons/lu";
import { PageHeader, PageLoading, Card, CardHeader, Badge, EmptyState, ErrorState, statusTone } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { CHART_PRIMARY } from "@/components/admin/Sparkline";

interface Progress {
    generatedAt: string;
    memberSince: string | null;
    credits: number;
    totals: {
        classesAllTime: number;
        classesThisMonth: number;
        classesLastMonth: number;
        sessionsCompleted: number;
        currentStreakWeeks: number;
        longestStreakWeeks: number;
    };
    weeks: { key: string; label: string; count: number }[];
    sessions: { id: string; at: string; status: string; teacher: string; notes: string | null }[];
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProgressPage() {
    const [data, setData] = useState<Progress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/progress", { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            setData((await res.json()) as Progress);
            setError(null);
        } catch {
            setError("Could not load your progress.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading && !data) return <PageLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={load} />;
    if (!data) return null;

    const { totals } = data;
    const momDelta = totals.classesLastMonth > 0
        ? Math.round(((totals.classesThisMonth - totals.classesLastMonth) / totals.classesLastMonth) * 100)
        : null;

    return (
        <div>
            <PageHeader
                title="My Progress"
                subtitle={data.memberSince ? `On the mat with Shakti since ${fmtDate(data.memberSince)}.` : "Your practice at a glance."}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Classes this month"
                    value={totals.classesThisMonth}
                    icon={<LuHeart />}
                    accent="green"
                    change={momDelta !== null ? `${momDelta > 0 ? "+" : ""}${momDelta}% vs last month` : undefined}
                    changeType={momDelta !== null && momDelta < 0 ? "negative" : "positive"}
                    trend={momDelta !== null ? (momDelta < 0 ? "down" : "up") : undefined}
                />
                <StatCard title="Classes all-time" value={totals.classesAllTime} icon={<LuHeart />} accent="blue" spark={data.weeks.map((w) => w.count)} />
                <StatCard title="Current streak" value={`${totals.currentStreakWeeks} wk`} icon={<LuFlame />} accent="amber" />
                <StatCard title="Longest streak" value={`${totals.longestStreakWeeks} wk`} icon={<LuAward />} accent="terracotta" />
            </div>

            <Card className="mb-8">
                <CardHeader title="Weekly attendance" subtitle="Classes joined per week, last 8 weeks" />
                <div className="p-5 sm:p-6">
                    {data.weeks.some((w) => w.count > 0) ? (
                        <TrendChart
                            series={data.weeks.map((w) => ({ label: w.label, value: w.count }))}
                            kind="bar"
                            color={CHART_PRIMARY}
                            format={(v) => String(Math.round(v))}
                        />
                    ) : (
                        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                            No classes joined in the last 8 weeks — your streak starts with the next one. 🌱
                        </div>
                    )}
                </div>
            </Card>

            <Card className="overflow-hidden">
                <CardHeader
                    title="Session history"
                    subtitle={`${totals.sessionsCompleted} completed · ${data.credits} credit${data.credits === 1 ? "" : "s"} left`}
                />
                {data.sessions.length === 0 ? (
                    <EmptyState icon={LuMessageSquare} title="No 1:1 sessions yet" hint="Your therapy session history and notes will appear here." />
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {data.sessions.map((s) => (
                            <li key={s.id} className="px-5 sm:px-6 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-medium text-gray-800">{fmtDate(s.at)}</span>
                                        <span className="text-sm text-gray-400"> · with {s.teacher}</span>
                                    </div>
                                    <Badge tone={statusTone(s.status)}>{s.status.replace("_", " ").toLowerCase()}</Badge>
                                </div>
                                {s.notes && (
                                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-3 whitespace-pre-wrap">
                                        {s.notes}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
