"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";

/* ---------- types ---------- */

interface Dashboard {
    generatedAt: string;
    partial: boolean;
    stats: {
        activeMembers: number;
        everydayMembers: number;
        therapyMembers: number;
        trialUsers: number;
        mrr: number;
        newMembers30d: number;
        newMembersGrowthPct: number | null;
    };
    attention: {
        pendingBookings: number;
        unhandledMessages: number;
        newLeads: number;
        expiringSoon: number;
        failedPayments7d: number;
        therapyOutOfCredits: number;
    };
    upcomingSessions: {
        id: string; member: string; teacher: string; type: string;
        status: string; at: string; hasLink: boolean;
    }[];
    upcomingClasses: {
        id: string; name: string; teacher: string; at: string; attendanceCount: number;
    }[];
    activity: { id: string; kind: string; message: string; at: string }[];
    recentSignups: {
        id: string; name: string; email: string; role: string; plan: string | null; at: string;
    }[];
}

/* ---------- helpers ---------- */

const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return "";
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function whenLabel(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    if (sameDay) return `Today ${time}`;
    if (tomorrow) return `Tomorrow ${time}`;
    return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

const DOT: Record<string, string> = {
    signup: "bg-green-500",
    payment: "bg-emerald-500",
    booking: "bg-blue-500",
    class: "bg-teal-500",
    trial: "bg-purple-500",
    alert: "bg-red-500",
    admin: "bg-gray-400",
    other: "bg-gray-300",
};

/* ---------- attention config ---------- */

type AttentionKey = keyof Dashboard["attention"];
const ATTENTION: { key: AttentionKey; label: (n: number) => string; href: string }[] = [
    { key: "pendingBookings", label: (n) => `${n} booking${n === 1 ? "" : "s"} awaiting confirmation`, href: "/admin/bookings" },
    { key: "unhandledMessages", label: (n) => `${n} unread contact message${n === 1 ? "" : "s"}`, href: "/admin/messages" },
    { key: "newLeads", label: (n) => `${n} new lead${n === 1 ? "" : "s"} to follow up`, href: "/admin/leads" },
    { key: "expiringSoon", label: (n) => `${n} subscription${n === 1 ? "" : "s"} expiring within 7 days`, href: "/admin/subscriptions" },
    { key: "failedPayments7d", label: (n) => `${n} failed payment${n === 1 ? "" : "s"} in the last week`, href: "/admin/subscriptions" },
    { key: "therapyOutOfCredits", label: (n) => `${n} therapy member${n === 1 ? "" : "s"} with no session credits`, href: "/admin/members" },
];

const QUICK_ACTIONS = [
    { href: "/admin/users", icon: "👤", label: "Users" },
    { href: "/admin/members", icon: "🪷", label: "Members" },
    { href: "/admin/classes", icon: "🧘‍♀️", label: "Classes" },
    { href: "/admin/bookings", icon: "📅", label: "Bookings" },
    { href: "/admin/leads", icon: "🎯", label: "Leads" },
    { href: "/admin/content", icon: "📝", label: "Content" },
];

/* ---------- small UI bits ---------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}>{children}</div>;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

/* ---------- page ---------- */

export default function AdminDashboardPage() {
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [, forceTick] = useState(0);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async (mode: "initial" | "refresh") => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        if (mode === "refresh") setRefreshing(true);
        try {
            const res = await fetch("/api/admin/dashboard", { signal: ac.signal, cache: "no-store" });
            if (res.status === 401 || res.status === 403) {
                setError("Your session has expired. Please sign in again.");
                return;
            }
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const json = (await res.json()) as Dashboard;
            setData(json);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            console.error("Dashboard load failed:", e);
            setError("Could not load the dashboard. Check your connection and retry.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load("initial");
        const poll = setInterval(() => load("refresh"), 60_000);
        const onFocus = () => load("refresh");
        const clock = setInterval(() => forceTick((n) => n + 1), 30_000); // keep "updated Xs ago" fresh
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(poll);
            clearInterval(clock);
            window.removeEventListener("focus", onFocus);
            abortRef.current?.abort();
        };
    }, [load]);

    /* ----- full error state (no data at all) ----- */
    if (error && !data) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard</h1>
                <Card className="p-8 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => { setLoading(true); load("initial"); }}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors"
                    >
                        Retry
                    </button>
                </Card>
            </div>
        );
    }

    /* ----- initial skeleton ----- */
    if (loading && !data) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}
                </div>
                <SkeletonBlock className="h-24 mb-8" />
                <div className="grid lg:grid-cols-3 gap-8">
                    <SkeletonBlock className="h-80 lg:col-span-2" />
                    <SkeletonBlock className="h-80" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { stats, attention } = data;
    const attentionItems = ATTENTION.filter((a) => attention[a.key] > 0);
    const growth = stats.newMembersGrowthPct;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                <h1 className="font-serif text-3xl text-gray-800">Dashboard</h1>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Updated {timeAgo(data.generatedAt)}</span>
                    <button
                        onClick={() => load("refresh")}
                        disabled={refreshing}
                        className="px-3 py-1.5 border border-gray-200 rounded font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            </div>

            {data.partial && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                    Some sections could not be loaded and may be incomplete. They will retry automatically.
                </div>
            )}

            {/* stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Active Members"
                    value={stats.activeMembers}
                    change={growth === null ? undefined : `${growth > 0 ? "+" : ""}${growth}% vs prev 30d`}
                    changeType={growth !== null && growth < 0 ? "negative" : "positive"}
                    trend={growth === null ? undefined : growth > 0 ? "up" : growth < 0 ? "down" : "stable"}
                />
                <StatCard title="Monthly Revenue" value={inr(stats.mrr)} />
                <StatCard title="Active Trials" value={stats.trialUsers} />
                <StatCard
                    title="Pending Bookings"
                    value={attention.pendingBookings}
                    changeType={attention.pendingBookings > 0 ? "negative" : "neutral"}
                />
            </div>

            {/* needs attention */}
            <Card className="p-6 mb-8">
                <h3 className="font-bold text-gray-800 mb-4">Needs Attention</h3>
                {attentionItems.length === 0 ? (
                    <p className="text-sm text-gray-500">All clear — nothing needs action right now. ✓</p>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                        {attentionItems.map((a) => (
                            <Link
                                key={a.key}
                                href={a.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-primary/[0.03] transition-colors group"
                            >
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-sm text-gray-700 flex-1">{a.label(attention[a.key])}</span>
                                <span className="text-gray-300 group-hover:text-primary transition-colors">→</span>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* left column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* upcoming */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Next 48 Hours</h3>
                            <Link href="/admin/schedule" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary">
                                Schedule
                            </Link>
                        </div>
                        {data.upcomingSessions.length === 0 && data.upcomingClasses.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Nothing scheduled.</p>
                        ) : (
                            <div className="space-y-2">
                                {data.upcomingClasses.map((c) => (
                                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-lg">🧘‍♀️</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                                            <p className="text-xs text-gray-500">Group class · {c.teacher}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{whenLabel(c.at)}</span>
                                    </div>
                                ))}
                                {data.upcomingSessions.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-lg">💬</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {s.member} <span className="text-gray-400">with</span> {s.teacher}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">
                                                {s.type} · {s.status.toLowerCase()}
                                                {!s.hasLink && <span className="text-orange-500"> · no meet link</span>}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{whenLabel(s.at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* recent signups */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Recent Signups</h3>
                            <Link href="/admin/users" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary">
                                All users
                            </Link>
                        </div>
                        {data.recentSignups.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No signups in the last 30 days.</p>
                        ) : (
                            <div className="space-y-1">
                                {data.recentSignups.map((u) => (
                                    <div key={u.id} className="flex items-center gap-3 py-2">
                                        <span className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-secondary font-serif text-sm shrink-0">
                                            {u.name.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                        </div>
                                        {u.plan && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize whitespace-nowrap">
                                                {u.plan}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(u.at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* quick actions */}
                    <Card className="p-6">
                        <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {QUICK_ACTIONS.map((q) => (
                                <Link
                                    key={q.href}
                                    href={q.href}
                                    className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 text-center transition-colors"
                                >
                                    <div className="text-xl mb-1">{q.icon}</div>
                                    <div className="text-xs font-bold text-gray-600">{q.label}</div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* right column: activity */}
                <Card className="p-6 self-start">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Recent Activity</h3>
                        <Link href="/admin/audit" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary">
                            Audit log
                        </Link>
                    </div>
                    {data.activity.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No recent activity.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.activity.map((a) => (
                                <div key={a.id} className="flex gap-3 text-sm">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${DOT[a.kind] ?? DOT.other}`} />
                                    <div className="min-w-0">
                                        <p className="text-gray-700 break-words">{a.message}</p>
                                        <p className="text-gray-400 text-xs">{timeAgo(a.at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
