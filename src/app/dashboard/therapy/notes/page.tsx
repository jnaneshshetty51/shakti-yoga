"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuNotebookPen } from "react-icons/lu";
import { PageHeader, Card, Badge, EmptyState, ErrorState, statusTone } from "@/components/ui";

interface Session {
    id: string;
    type: string;
    status: string;
    date: string;
    teacher: string;
    notes: string | null;
}

export default function SessionNotesPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const load = useCallback(() => {
        fetch("/api/bookings")
            .then((r) => {
                if (!r.ok) throw new Error("failed");
                return r.json();
            })
            .then((d) => {
                setSessions((d.bookings ?? []).filter((b: Session) => b.type === "THERAPY_SESSION"));
                setLoadError(false);
            })
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const retry = () => {
        setLoading(true);
        setLoadError(false);
        load();
    };

    return (
        <div className="max-w-3xl">
            <PageHeader title="Session Notes" subtitle="What your teacher recorded after each 1:1 session." />

            {loading ? (
                <p className="text-sm text-gray-400">Loading…</p>
            ) : loadError ? (
                <ErrorState message="Couldn't load your sessions." onRetry={retry} />
            ) : sessions.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={LuNotebookPen}
                        title="No therapy sessions yet"
                        hint="Notes show up here after your first session."
                        action={
                            <Link href="/dashboard/therapy/book" className="text-sm font-semibold text-primary hover:underline">
                                Book your first session →
                            </Link>
                        }
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {sessions.map((s) => (
                        <Card key={s.id} padded>
                            <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800">1:1 Therapy Session</h3>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                        {new Date(s.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST · with {s.teacher}
                                    </div>
                                </div>
                                <Badge tone={statusTone(s.status)}>{s.status.replace("_", " ").toLowerCase()}</Badge>
                            </div>

                            {s.notes ? (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teacher&rsquo;s notes</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s.notes}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">
                                    {s.status === "COMPLETED" ? "No notes were added for this session." : "Notes appear here after the session."}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
