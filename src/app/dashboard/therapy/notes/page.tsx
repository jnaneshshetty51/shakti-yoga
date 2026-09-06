"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Session {
    id: string;
    type: string;
    status: string;
    date: string;
    teacher: string;
    notes: string | null;
}

const STATUS_STYLE: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    PENDING: "bg-orange-100 text-orange-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    NO_SHOW: "bg-red-100 text-red-600",
};

export default function SessionNotesPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/bookings")
            .then((r) => r.json())
            .then((d) => setSessions((d.bookings ?? []).filter((b: Session) => b.type === "THERAPY_SESSION")))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/therapy/book" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">
                    ← Sessions
                </Link>
                <h1 className="font-serif text-3xl text-primary">Session Notes</h1>
            </div>

            {loading ? (
                <p className="text-sm text-text/50">Loading…</p>
            ) : sessions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-text/60">No therapy sessions yet.</p>
                    <Link href="/dashboard/therapy/book" className="text-primary font-bold hover:underline text-sm mt-2 inline-block">
                        Book your first session
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {sessions.map((s) => (
                        <div key={s.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">1:1 Therapy Session</h3>
                                    <div className="text-sm text-text/60">
                                        {new Date(s.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST · with {s.teacher}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${STATUS_STYLE[s.status] || "bg-gray-100 text-gray-500"}`}>
                                    {s.status.replace("_", " ").toLowerCase()}
                                </span>
                            </div>

                            {s.notes ? (
                                <div className="bg-gray-50 p-4 rounded border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teacher&apos;s notes</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s.notes}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-text/40 italic">
                                    {s.status === "COMPLETED" ? "No notes were added for this session." : "Notes appear here after the session."}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
