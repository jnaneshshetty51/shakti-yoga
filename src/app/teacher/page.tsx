"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
            alert(d.error || "Could not update the link");
            return;
        }
        load();
    };

    if (loading && !data) return <p className="text-gray-500">Loading…</p>;
    if (error && !data) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-4">Today</h1>
                <p className="text-gray-600 mb-4">{error}</p>
                <button onClick={load} className="px-4 py-2 bg-primary text-white text-sm font-bold uppercase tracking-widest rounded">Retry</button>
            </div>
        );
    }
    if (!data) return null;

    const { stats } = data;
    const todayClasses = data.classes.filter((c) => c.today);
    const laterClasses = data.classes.filter((c) => !c.today);

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800">Namaste, {data.teacher.name.split(" ")[0]}</h1>
                <p className="text-gray-500">Here's what's on for you.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Classes today", value: stats.classesToday },
                    { label: "Sessions this week", value: stats.sessionsThisWeek },
                    { label: "Attendance (7d)", value: stats.attendanceThisWeek },
                    { label: "Notes to write", value: stats.notesToWrite },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</div>
                        <div className="text-2xl font-bold text-gray-800 mt-0.5">{s.value}</div>
                    </div>
                ))}
            </div>

            {stats.notesToWrite > 0 && (
                <Link href="/teacher/sessions" className="block mb-8 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 hover:bg-yellow-100 transition-colors">
                    {stats.notesToWrite} completed session{stats.notesToWrite === 1 ? "" : "s"} still need notes →
                </Link>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                {/* classes */}
                <section className="bg-white rounded-lg border border-gray-100 p-6">
                    <h2 className="font-bold text-gray-800 mb-4">Group Classes</h2>
                    {data.classes.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No classes scheduled in the next 7 days.</p>
                    ) : (
                        <div className="space-y-4">
                            {[...todayClasses, ...laterClasses].map((c) => (
                                <div key={c.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800">{c.name}</p>
                                        <p className="text-xs text-gray-500">{when(c.at)} · {c.attendanceCount} joined</p>
                                        <button onClick={() => setLink("class", c.id, c.ownLink ? c.meetingLink : "")} className="text-xs text-primary hover:text-secondary mt-1">
                                            {c.ownLink ? "Change my link" : c.meetingLink ? "Override link" : "Set Meet link"}
                                        </button>
                                    </div>
                                    {c.meetingLink ? (
                                        <a
                                            href={c.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap ${c.joinable ? "bg-primary text-white hover:bg-secondary" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {c.joinable ? "Join now" : "Open Meet"}
                                        </a>
                                    ) : (
                                        <span className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-600 whitespace-nowrap">No link</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* sessions */}
                <section className="bg-white rounded-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-800">1:1 Sessions (7 days)</h2>
                        <Link href="/teacher/sessions" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary">All</Link>
                    </div>
                    {data.sessions.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No sessions booked in the next 7 days.</p>
                    ) : (
                        <div className="space-y-4">
                            {data.sessions.map((s) => (
                                <div key={s.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{s.member}</p>
                                        <p className="text-xs text-gray-500 capitalize">{when(s.at)} · {s.type} · {s.status.toLowerCase()}</p>
                                        <button onClick={() => setLink("session", s.id, "")} className="text-xs text-primary hover:text-secondary mt-1">
                                            {s.hasLink ? "Change link" : "Set Meet link"}
                                        </button>
                                    </div>
                                    {!s.hasLink && (
                                        <span className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-600 whitespace-nowrap">No link</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
