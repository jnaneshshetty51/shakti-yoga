"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuBell, LuTriangleAlert, LuCalendarClock, LuInfo, LuCheck } from "react-icons/lu";
import { PageHeader, PageLoading, Card, EmptyState, ErrorState } from "@/components/ui";

interface Item {
    id: string;
    kind: "alert" | "reminder" | "info";
    severity: "high" | "medium" | "low";
    title: string;
    body?: string;
    href: string;
    at: string;
    read: boolean;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const past = diff >= 0;
    const abs = Math.abs(diff);
    const m = Math.round(abs / 60000);
    const h = Math.round(m / 60);
    const d = Math.round(h / 24);
    const unit = m < 60 ? `${m}m` : h < 24 ? `${h}h` : `${d}d`;
    if (m < 1) return "just now";
    return past ? `${unit} ago` : `in ${unit}`;
}

const ICON = {
    alert: <LuTriangleAlert className="w-4 h-4 text-red-500" />,
    reminder: <LuCalendarClock className="w-4 h-4 text-amber-500" />,
    info: <LuInfo className="w-4 h-4 text-gray-400" />,
};

export default function ActivityPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/activity", { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            setItems(data.items);
            setUnread(data.unreadCount);
            setError(null);
        } catch {
            setError("Could not load your activity.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const post = async (payload: Record<string, unknown>) => {
        setBusy(true);
        try {
            await fetch("/api/activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            await load();
        } finally {
            setBusy(false);
        }
    };

    const markAllRead = () => {
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        setUnread(0);
        post({ action: "markAllRead" });
    };

    if (loading && items.length === 0) return <PageLoading />;
    if (error && items.length === 0) return <ErrorState message={error} onRetry={load} />;

    return (
        <div className="max-w-2xl">
            <PageHeader title="Activity" subtitle="Class reminders, session updates and account notices.">
                <button
                    onClick={markAllRead}
                    disabled={busy || unread === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                    <LuCheck className="text-sm" /> Mark all read
                </button>
            </PageHeader>

            {items.length === 0 ? (
                <Card>
                    <EmptyState icon={LuBell} title="Nothing right now" hint="Reminders for your next class or session will appear here." />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-gray-50">
                        {items.map((n) => (
                            <li key={n.id} className={`flex gap-3 px-5 py-4 ${n.read ? "" : "bg-primary/[0.025]"}`}>
                                <span className="mt-0.5 shrink-0">{ICON[n.kind]}</span>
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={n.href}
                                        onClick={() => !n.read && post({ action: "dismiss", id: n.id })}
                                        className="block"
                                    >
                                        <p className={`text-sm leading-snug ${n.read ? "text-gray-600" : "text-gray-800 font-medium"}`}>
                                            {n.title}
                                        </p>
                                        {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.at)}</p>
                                    </Link>
                                </div>
                                {!n.read && (
                                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.severity === "high" ? "bg-red-500" : n.severity === "medium" ? "bg-amber-500" : "bg-gray-300"}`} />
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
