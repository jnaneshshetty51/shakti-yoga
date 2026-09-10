"use client";

import { useState } from "react";
import { Card, Button } from "@/components/admin/ui";

export type Activity = {
    id: string;
    type: string;
    content: string;
    performedBy: string | null;
    createdAt: string;
};

const TYPE_OPTIONS = ["NOTE", "CALL", "EMAIL", "WHATSAPP", "MEETING"];

/** A CRM activity feed with a "log an interaction" composer. `endpoint` is the
 *  POST/GET url (e.g. /api/admin/leads/<id>). */
export function ActivityTimeline({
    endpoint,
    activities,
    onLogged,
}: {
    endpoint: string;
    activities: Activity[];
    onLogged: () => void;
}) {
    const [type, setType] = useState("NOTE");
    const [content, setContent] = useState("");
    const [busy, setBusy] = useState(false);

    const log = async () => {
        if (!content.trim()) return;
        setBusy(true);
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, content }),
            });
            if (res.ok) {
                setContent("");
                onLogged();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card padded>
            <h3 className="font-semibold text-ink mb-3 text-sm">Activity</h3>

            <div className="flex gap-2 mb-2">
                <select value={type} onChange={(e) => setType(e.target.value)}
                    className="rounded-control border border-hairline px-2 py-1.5 text-sm">
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>)}
                </select>
                <input value={content} onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && log()}
                    placeholder="What happened?"
                    className="flex-1 rounded-control border border-hairline px-3 py-1.5 text-sm" />
                <Button size="sm" loading={busy} onClick={log}>Log</Button>
            </div>

            {activities.length === 0 ? (
                <p className="text-sm text-ink-subtle">No activity yet.</p>
            ) : (
                <ul className="divide-y divide-hairline">
                    {activities.map((a) => (
                        <li key={a.id} className="py-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{a.type.replace(/_/g, " ")}</span>
                                <span className="text-xs text-ink-subtle">
                                    {a.performedBy ? `${a.performedBy} · ` : ""}
                                    {new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                                </span>
                            </div>
                            <p className="mt-0.5">{a.content}</p>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
