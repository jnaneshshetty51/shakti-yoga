"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuCalendarDays, LuMessageSquare, LuUsers, LuNotebookPen, LuTriangleAlert } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, Card, Badge, EmptyState, ErrorState } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";

interface Dash {
    generatedAt: string;
    teacher: { name: string };
    stats: {
        batches: number;
        classesToday: number;
        sessionsThisWeek: number;
        attendanceThisWeek: number;
        notesToWrite: number;
    };
    classes: {
        id: string; name: string; at: string; today: boolean; joinable: boolean;
        meetingLink: string | null; ownLink: boolean; attendanceCount: number; status: string;
    }[];
    sessions: {
        id: string; member: string; email: string; type: string;
        at: string; status: string; hasLink: boolean;
    }[];
    notesToWrite: { id: string; member: string; at: string }[];
}

function when(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    if (d.toDateString() === now.toDateString()) return `Today ${time}`;
    if (new Date(now.getTime() + 86400000).toDateString() === d.toDateString()) return `Tomorrow ${time}`;
    return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} ${time}`;
}

export default function TeacherTodayPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Dash | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const res = await fetch("/api/teacher/dashboard", { signal: ac.signal, cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            setData((await res.json()) as Dash);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            setError("Could not load your dashboard.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const poll = setInterval(load, 60_000);
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(poll);
            window.removeEventListener("focus", onFocus);
            abortRef.current?.abort();
        };
    }, [load]);

    const setLink = async (kind: "class" | "session", id: string, current: string | null) => {
        const url = window.prompt("Google Meet link (https://meet.google.com/xxx-xxxx-xxx). Leave blank to clear.", current ?? "");
        if (url === null) return;
        const res = await fetch("/api/teacher/meeting-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, id, url }),
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            showToast("error", d.error || "Could not update the link");
            return;
        }
        showToast("success", url ? "Meet link saved" : "Meet link cleared");
        load();
    };

    if (loading && !data) return <PageLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={load} />;
    if (!data) return null;

    const { stats } = data;
    const todayClasses = data.classes.filter((c) => c.today);
    const laterClasses = data.classes.filter((c) => !c.today);

    return (
        <div>
            <PageHeader
                eyebrow="Welcome back,"
                title={`Namaste, ${data.teacher.name.split(" ")[0]} 🙏`}
                subtitle="Here's what's on for you today and this week."
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard title="Classes today" value={stats.classesToday} icon={<LuCalendarDays />} accent="green" />
                <StatCard title="Sessions this week" value={stats.sessionsThisWeek} icon={<LuMessageSquare />} accent="blue" />
                <StatCard title="Attendance (7d)" value={stats.attendanceThisWeek} icon={<LuUsers />} accent="terracotta" />
                <StatCard title="Notes to write" value={stats.notesToWrite} icon={<LuNotebookPen />} accent="amber" />
            </div>

            {stats.notesToWrite > 0 && (
                <Link
                    href="/teacher/sessions"
                    className="flex items-center gap-2 mb-8 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                >
                    <LuTriangleAlert className="shrink-0" />
                    {stats.notesToWrite} completed session{stats.notesToWrite === 1 ? "" : "s"} still need notes →
                </Link>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                <Card padded>
                    <h2 className="font-bold text-gray-800 mb-4">Group classes</h2>
                    {data.classes.length === 0 ? (
                        <EmptyState icon={LuCalendarDays} title="Nothing in the next 7 days" />
                    ) : (
                        <div className="space-y-4">
                            {[...todayClasses, ...laterClasses].map((c) => (
                                <div key={c.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800">{c.name}</p>
                                        <p className="text-xs text-gray-500">{when(c.at)} · {c.attendanceCount} joined</p>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            <button onClick={() => setLink("class", c.id, c.ownLink ? c.meetingLink : "")} className="text-xs font-semibold text-primary hover:text-secondary">
                                                {c.ownLink ? "Change my link" : c.meetingLink ? "Override link" : "Set Meet link"}
                                            </button>
                                            {new Date(c.at).getTime() < Date.now() && (
                                                <Link href={`/teacher/classes/${c.id}/attendance`} className="text-xs font-semibold text-primary hover:text-secondary">
                                                    Take attendance →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {c.meetingLink ? (
                                        <a
                                            href={c.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${c.joinable ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {c.joinable ? "Join now" : "Open Meet"}
                                        </a>
                                    ) : (
                                        <Badge tone="amber">No link</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card padded>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-800">1:1 sessions (7 days)</h2>
                        <Link href="/teacher/sessions" className="text-xs font-semibold text-primary hover:text-secondary">All →</Link>
                    </div>
                    {data.sessions.length === 0 ? (
                        <EmptyState icon={LuMessageSquare} title="No sessions in the next 7 days" />
                    ) : (
                        <div className="space-y-4">
                            {data.sessions.map((s) => (
                                <div key={s.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{s.member}</p>
                                        <p className="text-xs text-gray-500 capitalize">{when(s.at)} · {s.type} · {s.status.toLowerCase()}</p>
                                        <button onClick={() => setLink("session", s.id, "")} className="text-xs font-semibold text-primary hover:text-secondary mt-1">
                                            {s.hasLink ? "Change link" : "Set Meet link"}
                                        </button>
                                    </div>
                                    {!s.hasLink && <Badge tone="amber">No link</Badge>}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
