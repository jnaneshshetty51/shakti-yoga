"use client";

import { useCallback, useEffect, useState } from "react";
import { LuLifeBuoy, LuSend, LuSearch } from "react-icons/lu";
import {
    PageHeader, PageLoading, Card, StatusBadge, EmptyState,
    SegmentedControl, Button,
} from "@/components/admin/ui";

interface Row {
    id: string;
    userName: string;
    userEmail: string;
    subject: string | null;
    status: "OPEN" | "CLOSED";
    assignedToName: string | null;
    messageCount: number;
    lastMessageAt: string;
}

interface Message {
    id: string;
    senderRole: string;
    body: string;
    createdAt: string;
}

interface Detail extends Row {
    messages: Message[];
}

function when(iso: string) {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function AdminSupportPage() {
    const [filter, setFilter] = useState<"OPEN" | "CLOSED">("OPEN");
    const [rows, setRows] = useState<Row[] | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Detail | null>(null);
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/support?status=${filter}`);
        if (res.ok) setRows((await res.json()).conversations);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const open = async (id: string) => {
        const res = await fetch(`/api/admin/support/${id}`);
        if (res.ok) setSelected((await res.json()).conversation);
    };

    const sendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !reply.trim()) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/admin/support/${selected.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: reply.trim() }),
            });
            if (res.ok) {
                setSelected((await res.json()).conversation);
                setReply("");
                load();
            }
        } finally {
            setBusy(false);
        }
    };

    const close = async () => {
        if (!selected || !confirm("Close this conversation? The member will need to start a new one.")) return;
        const res = await fetch(`/api/admin/support/${selected.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CLOSED" }),
        });
        if (res.ok) {
            setSelected(null);
            load();
        }
    };

    if (!rows) return <PageLoading title="Support" />;

    const q = search.trim().toLowerCase();
    const visibleRows = q
        ? rows.filter((r) =>
            r.userName.toLowerCase().includes(q) ||
            r.userEmail.toLowerCase().includes(q) ||
            (r.subject ?? "").toLowerCase().includes(q),
        )
        : rows;

    return (
        <div>
            <PageHeader title="Support" subtitle="Member conversations. Anyone on Support can reply — no manual assignment.">
                <SegmentedControl
                    aria-label="Filter"
                    value={filter}
                    onChange={setFilter}
                    options={[{ value: "OPEN", label: "Open" }, { value: "CLOSED", label: "Closed" }]}
                />
            </PageHeader>

            <div className="relative w-full sm:w-72 mb-4">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm" />
                <input
                    type="text" placeholder="Search name, email, subject…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-control border border-hairline text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
            </div>

            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
                <Card>
                    {visibleRows.length === 0 ? (
                        <EmptyState icon={LuLifeBuoy} title={q ? "No matching conversations" : `No ${filter.toLowerCase()} conversations`} />
                    ) : (
                        <div className="divide-y divide-hairline">
                            {visibleRows.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => open(r.id)}
                                    className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors ${selected?.id === r.id ? "bg-brand/5" : ""}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-ink truncate">{r.userName}</span>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    <div className="text-xs text-ink-subtle truncate mt-0.5">{r.subject || "No subject"} · {r.messageCount} message{r.messageCount === 1 ? "" : "s"}</div>
                                    <div className="text-xs text-ink-subtle mt-0.5">{when(r.lastMessageAt)}{r.assignedToName ? ` · ${r.assignedToName}` : ""}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                <Card padded>
                    {!selected ? (
                        <EmptyState icon={LuLifeBuoy} title="Select a conversation" hint="Pick one from the list to view and reply." />
                    ) : (
                        <div>
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <div className="font-semibold text-ink">{selected.userName}</div>
                                    <div className="text-xs text-ink-subtle">{selected.userEmail}</div>
                                </div>
                                {selected.status === "OPEN" && (
                                    <Button size="sm" variant="secondary" onClick={close}>Close conversation</Button>
                                )}
                            </div>

                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 mb-4">
                                {selected.messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.senderRole === "staff" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                            m.senderRole === "staff" ? "bg-brand text-white" : "bg-black/[0.04] text-ink"
                                        }`}>
                                            {m.body}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selected.status === "OPEN" ? (
                                <form onSubmit={sendReply} className="flex gap-2">
                                    <input
                                        placeholder="Reply…"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-control border border-hairline text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
                                    />
                                    <Button type="submit" disabled={busy || !reply.trim()} icon={LuSend} />
                                </form>
                            ) : (
                                <p className="text-sm text-ink-subtle">This conversation is closed.</p>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
