"use client";

import { LuUsers, LuIndianRupee, LuUserPlus, LuActivity } from "react-icons/lu";
import { StatCard } from "@/components/admin/StatCard";
import type { Dashboard } from "./lib";
import { inr } from "./lib";

function deltaChip(delta: number | null) {
    if (delta === null || delta === 0) return undefined;
    return {
        change: `${delta > 0 ? "+" : ""}${delta}% vs prev 30d`,
        negative: delta < 0,
    };
}

export function KpiBand({ data }: { data: Dashboard }) {
    const { stats, classFill } = data;
    const newChip = deltaChip(stats.newMembersDelta);

    const secondary = [
        { label: "Active trials", value: String(stats.trialUsers) },
        { label: "Lapsed (30d)", value: String(stats.lapsed) },
        { label: "Paused", value: String(stats.paused) },
        { label: "Renewals · 7d", value: inr(stats.renewalRevenue7d) },
        { label: "Renewals · 30d", value: inr(stats.renewalRevenue30d) },
    ];

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Active members"
                    value={stats.activeMembers}
                    icon={<LuUsers />}
                    accent="green"
                    change={`${stats.everydayMembers} everyday · ${stats.therapyMembers} therapy`}
                    changeType="neutral"
                />
                <StatCard
                    title="Monthly revenue"
                    value={inr(stats.mrr)}
                    icon={<LuIndianRupee />}
                    accent="terracotta"
                    spark={data.trends.revenue.map((p) => p.value)}
                />
                <StatCard
                    title="New members (30d)"
                    value={stats.newMembers}
                    icon={<LuUserPlus />}
                    accent="blue"
                    change={newChip?.change}
                    changeType={newChip?.negative ? "negative" : "positive"}
                    trend={newChip ? (newChip.negative ? "down" : "up") : undefined}
                    spark={data.trends.signups.map((p) => p.value)}
                />
                <StatCard
                    title="Class fill rate"
                    value={`${classFill.rate}%`}
                    icon={<LuActivity />}
                    accent="amber"
                    change={`${classFill.avgAttendees} avg / ${classFill.classes} classes`}
                    changeType="neutral"
                    spark={data.trends.attendance.map((p) => p.value)}
                />
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {secondary.map((s) => (
                    <div key={s.label} className="bg-surface border border-hairline rounded-control px-3 py-2.5">
                        <div className="text-[11px] font-medium text-ink-subtle truncate">{s.label}</div>
                        <div className="text-sm font-semibold text-ink mt-0.5 num">{s.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
