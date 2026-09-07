"use client";

import Link from "next/link";
import { LuCalendarClock, LuVideo, LuMessageSquare } from "react-icons/lu";
import { Card, CardHeader, EmptyState } from "@/components/admin/ui";
import type { Dashboard } from "./lib";
import { timeAgo, whenLabel } from "./lib";

const ACTIVITY_DOT: Record<string, string> = {
    signup: "rgb(var(--ok))", payment: "rgb(var(--ok))", booking: "rgb(var(--info))",
    class: "rgb(var(--brand))", trial: "var(--cat-4)", alert: "rgb(var(--danger))",
    admin: "rgb(var(--ink-subtle))", other: "rgb(var(--border-strong))",
};

function ActivityDay({ label, items }: { label: string; items: Dashboard["activity"] }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle px-1 mb-1.5">{label}</div>
            <ul className="space-y-2.5">
                {items.map((a) => (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                        <span
                            className="w-1.5 h-1.5 mt-1.5 rounded-full shrink-0"
                            style={{ background: ACTIVITY_DOT[a.kind] ?? ACTIVITY_DOT.other }}
                        />
                        <div className="min-w-0">
                            <p className="text-ink-muted break-words leading-snug">{a.message}</p>
                            <p className="text-ink-subtle text-xs num">{timeAgo(a.at)}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function OperationsRail({ data }: { data: Dashboard }) {
    const nothingUpcoming = data.upcomingSessions.length === 0 && data.upcomingClasses.length === 0;

    const today: Dashboard["activity"] = [];
    const earlier: Dashboard["activity"] = [];
    const todayStr = new Date().toDateString();
    for (const a of data.activity) {
        (new Date(a.at).toDateString() === todayStr ? today : earlier).push(a);
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card>
                <CardHeader
                    title="Next 48 hours"
                    action={<Link href="/admin/schedule" className="text-xs font-semibold text-brand hover:text-brand-strong">Schedule →</Link>}
                />
                {nothingUpcoming ? (
                    <EmptyState icon={LuCalendarClock} title="Nothing scheduled" hint="Classes and sessions in the next two days will appear here." />
                ) : (
                    <ul className="divide-y divide-hairline">
                        {data.upcomingClasses.map((c) => (
                            <li key={c.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                <span className="w-8 h-8 rounded-control bg-brand/10 text-brand flex items-center justify-center shrink-0">
                                    <LuVideo className="w-4 h-4" />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                                    <p className="text-xs text-ink-subtle">Group class · {c.teacher}</p>
                                </div>
                                <span className="text-xs text-ink-subtle whitespace-nowrap num">{whenLabel(c.at)}</span>
                            </li>
                        ))}
                        {data.upcomingSessions.map((s) => (
                            <li key={s.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                <span className="w-8 h-8 rounded-control bg-info/10 text-info flex items-center justify-center shrink-0">
                                    <LuMessageSquare className="w-4 h-4" />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink truncate">
                                        {s.member} <span className="text-ink-subtle">with</span> {s.teacher}
                                    </p>
                                    <p className="text-xs text-ink-subtle capitalize">
                                        {s.type} · {s.status.toLowerCase()}
                                        {!s.hasLink && <span className="text-warn"> · no meet link</span>}
                                    </p>
                                </div>
                                <span className="text-xs text-ink-subtle whitespace-nowrap num">{whenLabel(s.at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card>
                <CardHeader
                    title="Recent activity"
                    action={<Link href="/admin/audit" className="text-xs font-semibold text-brand hover:text-brand-strong">Audit log →</Link>}
                />
                <div className="p-5 sm:p-6">
                    {data.activity.length === 0 ? (
                        <EmptyState icon={LuMessageSquare} title="No recent activity" />
                    ) : (
                        <div className="space-y-5">
                            {today.length > 0 && <ActivityDay label="Today" items={today} />}
                            {earlier.length > 0 && <ActivityDay label="Earlier" items={earlier} />}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
