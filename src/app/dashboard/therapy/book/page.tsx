"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Badge, statusTone, useConfirmDialog } from "@/components/ui";
import { LuLock } from "react-icons/lu";

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
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState("");
    const { confirm, dialog } = useConfirmDialog();

    const dates = Array.from({ length: 10 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });
    const [pickDate, setPickDate] = useState(istDateKey(dates[1]));
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [pickSlot, setPickSlot] = useState<string | null>(null);

    const [reschedulingSession, setReschedulingSession] = useState<Session | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState(istDateKey(dates[1]));
    const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
    const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
    const [reschedulePickSlot, setReschedulePickSlot] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bookings");
            if (!res.ok) throw new Error("Failed to load sessions");
            const data = await res.json();
            setSessions(data.bookings ?? []);
            setSessionsError(null);
        } catch (err) {
            console.error(err);
            setSessionsError("Could not load your sessions.");
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

    useEffect(() => {
        if (!reschedulingSession) return;
        let cancelled = false;
        setRescheduleSlotsLoading(true);
        setReschedulePickSlot(null);
        fetch(`/api/therapy/slots?date=${rescheduleDate}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled) setRescheduleSlots(d.slots ?? []); })
            .finally(() => { if (!cancelled) setRescheduleSlotsLoading(false); });
        return () => { cancelled = true; };
    }, [rescheduleDate, reschedulingSession]);

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

    const handleReschedule = async () => {
        if (!reschedulingSession || !reschedulePickSlot) return;
        setBusy("reschedule");
        setMsg("");
        try {
            const res = await fetch(`/api/bookings/${reschedulingSession.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: rescheduleDate, slot: reschedulePickSlot }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not reschedule.");
            await loadSessions();
            setMsg("Session rescheduled successfully.");
            setReschedulingSession(null);
            setReschedulePickSlot(null);
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "Could not reschedule.");
        } finally {
            setBusy(null);
        }
    };

    const cancel = async (s: Session) => {
        const ok = await confirm({
            title: "Cancel this session?",
            message: "Cancelling at least 24h ahead returns your credit.",
            confirmLabel: "Cancel session",
            tone: "danger",
        });
        if (!ok) return;
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
            {dialog}
            <PageHeader title="Therapy Sessions" subtitle="Book, join and manage your 1:1 sessions.">
                <Badge tone="amber">{credits} credit{credits === 1 ? "" : "s"}</Badge>
                <Link href="/dashboard/therapy/notes" className="text-xs font-semibold text-primary hover:text-secondary">Session notes →</Link>
            </PageHeader>

            {msg && <div className="mb-6 p-3 bg-accent/40 border border-primary/10 text-sm text-text rounded-xl">{msg}</div>}

            {credits > 0 ? (
                <Card padded className="mb-8">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Book a session</h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        {dates.map((d) => {
                            const k = istDateKey(d);
                            const on = pickDate === k;
                            return (
                                <button
                                    key={k}
                                    onClick={() => setPickDate(k)}
                                    className={`min-w-[60px] p-2.5 rounded-xl border flex flex-col items-center transition-colors ${on ? "bg-primary text-white border-primary" : "border-gray-200 hover:border-primary/40 bg-white text-gray-600"}`}
                                >
                                    <span className="text-[10px] uppercase font-bold opacity-70">{d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}</span>
                                    <span className="text-lg font-serif">{d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
                                </button>
                            );
                        })}
                    </div>
                    {slotsLoading ? (
                        <p className="text-sm text-gray-400">Loading slots…</p>
                    ) : slots.length === 0 ? (
                        <p className="text-sm text-gray-400">No open slots that day. Try another date.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {slots.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setPickSlot(s)}
                                    className={`p-2.5 rounded-xl border text-sm transition-colors ${pickSlot === s ? "bg-secondary text-white border-secondary font-semibold" : "border-gray-200 hover:border-secondary/40 text-gray-600"}`}
                                >
                                    {s.split(" - ")[0]}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={book}
                        disabled={!pickSlot || busy === "book"}
                        className="mt-5 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {busy === "book" ? "Booking…" : "Confirm — 1 credit"}
                    </button>
                </Card>
            ) : upcoming.length === 0 ? (
                <Card padded className="text-center max-w-lg mx-auto py-10 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl mx-auto mb-3"><LuLock /></div>
                    <h3 className="font-serif text-xl text-gray-800 mb-2">No session credits</h3>
                    <p className="text-sm text-gray-500 mb-6">Subscribe to Yoga Therapy to get monthly 1:1 sessions.</p>
                    <Link href="/checkout?plan=therapy" className="inline-flex px-6 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors">
                        Subscribe to Yoga Therapy
                    </Link>
                </Card>
            ) : null}

            <section className="mb-8">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</h2>
                {loading ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                ) : sessionsError ? (
                    <Card padded className="text-sm text-gray-500 flex items-center justify-between gap-3">
                        <span>{sessionsError}</span>
                        <button onClick={loadSessions} className="text-xs font-semibold text-primary hover:text-secondary shrink-0">Retry</button>
                    </Card>
                ) : upcoming.length === 0 ? (
                    <Card padded className="text-sm text-gray-500">No upcoming sessions.</Card>
                ) : (
                    <div className="space-y-3">
                        {upcoming.map((s) => {
                            const canReschedule = new Date(s.date).getTime() - Date.now() >= 24 * 3_600_000;
                            return (
                                <Card key={s.id} padded className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="font-bold text-gray-800">{fmt(s.date)} IST</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {s.type === "THERAPY_SESSION" ? "1:1 Therapy" : "Consultation"} · {s.teacher} · <span className="capitalize">{s.status.toLowerCase()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => join(s)} disabled={busy === s.id} className="px-4 py-2 text-xs font-semibold rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50">Join</button>
                                        {canReschedule && (
                                            <button
                                                onClick={() => {
                                                    setReschedulingSession(s);
                                                    setRescheduleDate(istDateKey(dates[1]));
                                                }}
                                                disabled={busy === s.id}
                                                className="px-4 py-2 text-xs font-semibold rounded-full border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
                                            >
                                                Reschedule
                                            </button>
                                        )}
                                        <button onClick={() => cancel(s)} disabled={busy === s.id} className="px-4 py-2 text-xs font-semibold rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {past.length > 0 && (
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Past sessions</h2>
                    <Card className="divide-y divide-gray-50">
                        {past.map((s) => (
                            <div key={s.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">{fmt(s.date)}</span>
                                    <span className="text-xs text-gray-400 ml-2">with {s.teacher}</span>
                                </div>
                                <Badge tone={statusTone(s.status)}>{s.status.replace("_", " ").toLowerCase()}</Badge>
                            </div>
                        ))}
                    </Card>
                </section>
            )}

            {/* Reschedule Modal */}
            {reschedulingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="font-serif text-xl text-gray-800 mb-1">Reschedule your session</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Current session: <strong className="text-gray-700">{fmt(reschedulingSession.date)}</strong> with {reschedulingSession.teacher}.
                        </p>

                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                            {dates.slice(1).map((d) => {
                                const k = istDateKey(d);
                                const on = rescheduleDate === k;
                                return (
                                    <button
                                        key={k}
                                        onClick={() => setRescheduleDate(k)}
                                        className={`min-w-[60px] p-2 rounded-xl border flex flex-col items-center transition-colors ${on ? "bg-primary text-white border-primary" : "border-gray-200 hover:border-primary/40 bg-white text-gray-600"}`}
                                    >
                                        <span className="text-[10px] uppercase font-bold opacity-70">{d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}</span>
                                        <span className="text-base font-serif">{d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {rescheduleSlotsLoading ? (
                            <p className="text-sm text-gray-400">Loading available slots…</p>
                        ) : rescheduleSlots.length === 0 ? (
                            <p className="text-sm text-gray-400">No open slots on that day. Try another date.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                                {rescheduleSlots.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setReschedulePickSlot(s)}
                                        className={`p-2.5 rounded-xl border text-sm transition-colors ${reschedulePickSlot === s ? "bg-secondary text-white border-secondary font-semibold" : "border-gray-200 hover:border-secondary/40 text-gray-600"}`}
                                    >
                                        {s.split(" - ")[0]}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setReschedulingSession(null)}
                                disabled={busy === "reschedule"}
                                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReschedule}
                                disabled={!reschedulePickSlot || busy === "reschedule"}
                                className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {busy === "reschedule" ? "Rescheduling…" : "Confirm Reschedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
