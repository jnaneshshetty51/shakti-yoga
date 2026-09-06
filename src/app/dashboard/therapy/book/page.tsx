"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Session {
    id: string;
    type: string;
    status: string;
    date: string;
    teacher: string;
    notes: string | null;
    hasMeetingLink: boolean;
}

function istDateKey(d: Date) {
    return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        hour12: true, timeZone: "Asia/Kolkata",
    });
}

export default function TherapyBookingPage() {
    const { user, refreshUser } = useAuth();
    const credits = user?.credits ?? 0;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState("");

    // booking form
    const dates = Array.from({ length: 10 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });
    const [pickDate, setPickDate] = useState(istDateKey(dates[1]));
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [pickSlot, setPickSlot] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            if (res.ok) setSessions(data.bookings ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    useEffect(() => {
        let cancelled = false;
        setSlotsLoading(true);
        setPickSlot(null);
        fetch(`/api/therapy/slots?date=${pickDate}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled) setSlots(d.slots ?? []); })
            .finally(() => { if (!cancelled) setSlotsLoading(false); });
        return () => { cancelled = true; };
    }, [pickDate]);

    const book = async () => {
        if (!pickSlot) return;
        setBusy("book");
        setMsg("");
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: pickDate, slot: pickSlot }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not book.");
            await refreshUser();
            await loadSessions();
            setMsg(`Booked. ${data.creditsRemaining ?? 0} credit(s) left.`);
            setPickSlot(null);
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "Could not book.");
        } finally {
            setBusy(null);
        }
    };

    const cancel = async (s: Session) => {
        if (!confirm("Cancel this session? Cancelling at least 24h ahead returns your credit.")) return;
        setBusy(s.id);
        try {
            const res = await fetch(`/api/bookings/${s.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { setMsg(data.error || "Could not cancel."); return; }
            await refreshUser();
            await loadSessions();
            setMsg(data.creditsRestored ? "Cancelled — credit returned." : "Cancelled.");
        } finally {
            setBusy(null);
        }
    };

    const join = async (s: Session) => {
        setBusy(s.id);
        try {
            const res = await fetch(`/api/bookings/${s.id}`);
            const data = await res.json();
            if (res.ok && data.meetingLink) window.open(data.meetingLink, "_blank", "noopener,noreferrer");
            else setMsg(data.error || "The link isn't available yet.");
        } finally {
            setBusy(null);
        }
    };

    const upcoming = sessions.filter((s) => ["PENDING", "CONFIRMED"].includes(s.status) && new Date(s.date).getTime() > Date.now() - 3600_000);
    const past = sessions.filter((s) => !upcoming.includes(s));

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">← Back</Link>
                    <h1 className="font-serif text-2xl sm:text-3xl text-primary">Therapy Sessions</h1>
                </div>
                <div className="bg-secondary/10 px-4 py-2 rounded-full text-secondary font-bold text-sm">{credits} credit{credits === 1 ? "" : "s"}</div>
            </div>

            {msg && <div className="mb-6 p-3 bg-accent/40 border border-primary/10 text-sm text-text rounded">{msg}</div>}

            {credits === 0 && upcoming.length === 0 ? (
                <div className="bg-white border border-primary/10 p-8 rounded-lg shadow-sm text-center max-w-lg mx-auto">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="font-serif text-2xl text-primary mb-2">No session credits</h3>
                    <p className="text-sm text-gray-600 mb-6">Subscribe to Yoga Therapy to get monthly 1:1 sessions.</p>
                    <Link href="/checkout?plan=therapy" className="inline-block px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors">
                        Subscribe (₹5,000/mo)
                    </Link>
                </div>
            ) : (
                <>
                    {/* Book */}
                    {credits > 0 && (
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 mb-8">
                            <h2 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-4">Book a session</h2>
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                                {dates.map((d) => {
                                    const k = istDateKey(d);
                                    return (
                                        <button
                                            key={k}
                                            onClick={() => setPickDate(k)}
                                            className={`min-w-[64px] p-3 rounded border flex flex-col items-center transition-all ${pickDate === k ? "bg-primary text-white border-primary" : "border-gray-200 hover:border-primary/50 bg-gray-50 text-text/80"}`}
                                        >
                                            <span className="text-[10px] uppercase font-bold opacity-70">{d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}</span>
                                            <span className="text-lg font-serif">{d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {slotsLoading ? (
                                <p className="text-sm text-text/50">Loading slots…</p>
                            ) : slots.length === 0 ? (
                                <p className="text-sm text-text/50">No open slots that day. Try another date.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {slots.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setPickSlot(s)}
                                            className={`p-3 rounded border text-sm transition-all ${pickSlot === s ? "bg-secondary text-white border-secondary font-bold" : "border-gray-200 hover:border-secondary/50 text-text/80"}`}
                                        >
                                            {s.split(" - ")[0]}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={book}
                                disabled={!pickSlot || busy === "book"}
                                className="mt-5 px-8 py-3 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors disabled:opacity-50"
                            >
                                {busy === "book" ? "Booking…" : "Confirm — 1 credit"}
                            </button>
                        </section>
                    )}

                    {/* Upcoming */}
                    <section className="mb-8">
                        <h2 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-3">Upcoming</h2>
                        {loading ? <p className="text-sm text-text/50">Loading…</p>
                            : upcoming.length === 0 ? <p className="text-sm text-text/50">No upcoming sessions.</p>
                                : (
                                    <div className="space-y-3">
                                        {upcoming.map((s) => (
                                            <div key={s.id} className="bg-white p-4 rounded-lg border border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-bold text-gray-800">{fmt(s.date)} IST</div>
                                                    <div className="text-xs text-text/50">{s.type === "THERAPY_SESSION" ? "1:1 Therapy" : "Consultation"} · {s.teacher} · {s.status.toLowerCase()}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => join(s)} disabled={busy === s.id} className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded bg-primary text-white hover:bg-secondary disabled:opacity-50">Join</button>
                                                    <button onClick={() => cancel(s)} disabled={busy === s.id} className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                    </section>

                    {/* Past */}
                    {past.length > 0 && (
                        <section>
                            <h2 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-3">Past</h2>
                            <div className="space-y-2">
                                {past.map((s) => (
                                    <div key={s.id} className="bg-white/60 p-3 rounded-lg border border-gray-100 flex items-center justify-between text-sm">
                                        <span className="text-text/70">{fmt(s.date)}</span>
                                        <span className="text-xs uppercase tracking-widest text-text/40">{s.status.toLowerCase()}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
