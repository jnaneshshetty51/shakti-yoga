"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, PageLoading, Card, Badge, SegmentedControl, Button, Tabs } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Update = {
    id: string; userId: string; name: string; email: string; body: string;
    status: string; reviewNote: string | null; reviewedBy: string | null; reviewedAt: string | null; createdAt: string;
};

export default function PatientUpdatesPage() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<Update[] | null>(null);
    const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");
    const [noteFor, setNoteFor] = useState<string | null>(null);
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/therapy/updates?status=${filter}`);
        if (res.ok) setRows((await res.json()).updates);
    }, [filter]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const review = async (id: string) => {
        const res = await fetch("/api/admin/therapy/updates", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, reviewNote: note || undefined }),
        });
        if (!res.ok) return showToast("error", "Failed");
        setNoteFor(null);
        setNote("");
        showToast("success", "Marked reviewed.");
        load();
    };

    if (!rows) return <PageLoading title="Patient updates" />;

    return (
        <div>
            <PageHeader title="Yoga Therapy & Patient Care" subtitle="Between-session medical notes and symptom updates from Yoga Therapy members.">
                <SegmentedControl
                    options={[{ value: "pending", label: "Pending" }, { value: "reviewed", label: "Reviewed" }, { value: "all", label: "All" }]}
                    value={filter}
                    onChange={setFilter}
                />
            </PageHeader>

            <div className="mb-6">
                <Tabs
                    active="updates"
                    onChange={(k) => {
                        if (k === "intakes") window.location.href = "/admin/therapy";
                    }}
                    tabs={[
                        { key: "intakes", label: "Intake Assessments" },
                        { key: "updates", label: "Patient Progress Updates", count: rows.length },
                    ]}
                />
            </div>

            {rows.length === 0 ? (
                <Card padded><p className="text-sm text-ink-subtle">Nothing here.</p></Card>
            ) : (
                <div className="space-y-3">
                    {rows.map((u) => (
                        <Card key={u.id} padded>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <Link href={`/admin/members/${u.userId}`} className="font-semibold text-ink hover:underline">{u.name}</Link>
                                    <span className="text-xs text-ink-subtle ml-2">{new Date(u.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                                <Badge tone={u.status === "PENDING" ? "amber" : "green"}>{u.status.toLowerCase()}</Badge>
                            </div>
                            <p className="text-sm mt-2 whitespace-pre-wrap">{u.body}</p>

                            {u.status === "REVIEWED" && u.reviewNote && (
                                <p className="text-sm mt-2 border-l-2 border-hairline pl-3 text-ink-muted">
                                    <span className="text-xs text-ink-subtle">{u.reviewedBy}: </span>{u.reviewNote}
                                </p>
                            )}

                            {u.status === "PENDING" && (
                                <div className="mt-3">
                                    {noteFor === u.id ? (
                                        <div className="flex gap-2">
                                            <input value={note} onChange={(e) => setNote(e.target.value)}
                                                placeholder="Optional reply to the member…"
                                                className="flex-1 rounded-control border border-hairline px-3 py-1.5 text-sm" />
                                            <Button size="sm" onClick={() => review(u.id)}>Mark reviewed</Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNote(""); }}>Cancel</Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="ghost" onClick={() => setNoteFor(u.id)}>Review</Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
