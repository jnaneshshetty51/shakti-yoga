"use client";

import Link from "next/link";
import { LuChevronRight, LuCircleCheck } from "react-icons/lu";
import { Card } from "@/components/admin/ui";
import type { Dashboard } from "./lib";

type Sev = "danger" | "warn" | "info";
type AttentionKey = keyof Dashboard["attention"];

const ITEMS: { key: AttentionKey; sev: Sev; label: (n: number) => string; href: string }[] = [
    { key: "failedPayments7d", sev: "danger", label: (n) => `failed payment${n === 1 ? "" : "s"} this week`, href: "/admin/payments?status=FAILED" },
    { key: "bookingsNoLink", sev: "danger", label: (n) => `upcoming session${n === 1 ? "" : "s"} with no Meet link`, href: "/admin/bookings" },
    { key: "pendingBookings", sev: "warn", label: (n) => `booking${n === 1 ? "" : "s"} awaiting confirmation`, href: "/admin/bookings" },
    { key: "expiringSoon", sev: "warn", label: (n) => `subscription${n === 1 ? "" : "s"} expiring within 7 days`, href: "/admin/subscriptions" },
    { key: "unhandledMessages", sev: "warn", label: (n) => `unread contact message${n === 1 ? "" : "s"}`, href: "/admin/messages" },
    { key: "newLeads", sev: "warn", label: (n) => `new lead${n === 1 ? "" : "s"} to follow up`, href: "/admin/leads" },
    { key: "therapyOutOfCredits", sev: "info", label: (n) => `therapy member${n === 1 ? "" : "s"} with no credits`, href: "/admin/members" },
    { key: "dormantMembers", sev: "info", label: (n) => `active member${n === 1 ? "" : "s"} not seen in 30+ days`, href: "/admin/members" },
    { key: "contentDrafts", sev: "info", label: (n) => `content draft${n === 1 ? "" : "s"} awaiting review`, href: "/admin/content" },
];

const DOT: Record<Sev, string> = { danger: "bg-danger", warn: "bg-warn", info: "bg-info" };
const LOZENGE: Record<Sev, string> = {
    danger: "bg-red-50 text-red-700",
    warn: "bg-amber-50 text-amber-700",
    info: "bg-black/[0.05] text-ink-muted",
};

export function AttentionStrip({ data }: { data: Dashboard }) {
    const items = ITEMS.filter((i) => data.attention[i.key] > 0);

    if (items.length === 0) {
        return (
            <Card padded className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-ok/10 text-ok flex items-center justify-center">
                    <LuCircleCheck className="w-5 h-5" />
                </span>
                <div>
                    <p className="text-sm font-medium text-ink">You&rsquo;re all caught up</p>
                    <p className="text-xs text-ink-subtle">Nothing needs action right now.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card padded>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink text-sm">Needs attention</h3>
                <span className="text-xs text-ink-subtle num">{items.length} item{items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {items.map((i) => {
                    const n = data.attention[i.key];
                    return (
                        <Link
                            key={i.key}
                            href={i.href}
                            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-control hover:bg-surface-hover transition-colors"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[i.sev]}`} />
                            <span className={`num text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${LOZENGE[i.sev]}`}>{n}</span>
                            <span className="text-sm text-ink-muted flex-1 truncate">{i.label(n)}</span>
                            <LuChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink-muted shrink-0" />
                        </Link>
                    );
                })}
            </div>
        </Card>
    );
}
