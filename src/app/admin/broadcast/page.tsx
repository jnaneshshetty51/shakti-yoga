"use client";

import { useCallback, useEffect, useState } from "react";
import { LuSend, LuBell } from "react-icons/lu";
import { PageHeader, Card, Button, PageLoading, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Segment = { key: string; label: string; total: number; reachable: number };
type HistoryRow = {
    id: string; title: string; body: string; url: string | null; segment: string;
    channelId: string; recipients: number; by: string | null; at: string;
};
type Data = { segments: Segment[]; channels: string[]; history: HistoryRow[] };

export default function BroadcastPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Data | null>(null);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("");
    const [segment, setSegment] = useState("");
    const [channelId, setChannelId] = useState("default");
    const [sending, setSending] = useState<"" | "test" | "live">("");

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/broadcast");
        if (res.ok) setData(await res.json());
    }, []);
    useEffect(() => { load(); }, [load]);

    const send = async (test: boolean) => {
        if (!title.trim() || !body.trim()) return showToast("error", "Title and message are required.");
        if (!test && !segment) return showToast("error", "Choose an audience.");
        const seg = data?.segments.find((s) => s.key === segment);
        if (!test && seg && !confirm(`Send "${title}" to ${seg.reachable} device(s) in "${seg.label}"?`)) return;

        setSending(test ? "test" : "live");
        try {
            const res = await fetch("/api/admin/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body, url: url || undefined, segment, channelId, test }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Send failed");
            showToast("success", test ? "Test sent to your device." : `Sent to ${json.recipients} device(s).`);
            if (!test) { setTitle(""); setBody(""); setUrl(""); load(); }
        } catch (e) {
            showToast("error", e instanceof Error ? e.message : "Send failed");
        } finally {
            setSending("");
        }
    };

    if (!data) return <PageLoading title="Broadcast" />;

    return (
        <div>
            <PageHeader
                title="Push Broadcast"
                subtitle="Send mobile push notifications to active, trial, or at-risk member segments. Always test on your own device first."
            />

            <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
                <Card padded>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Title</label>
                            <input className={inputClass} value={title} maxLength={80}
                                onChange={(e) => setTitle(e.target.value)} placeholder="New 30-day challenge is live" />
                        </div>
                        <div>
                            <label className={labelClass}>Message</label>
                            <textarea className={inputClass} rows={3} value={body} maxLength={240}
                                onChange={(e) => setBody(e.target.value)} placeholder="Join by Sunday to get the full window." />
                            <p className="text-xs text-ink-subtle mt-1">{body.length}/240</p>
                        </div>
                        <div>
                            <label className={labelClass}>Opens (optional)</label>
                            <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)}
                                placeholder="/dashboard/classes  ·  /post/{id}  ·  /dashboard/billing" />
                        </div>
                        <div>
                            <label className={labelClass}>Channel (Android)</label>
                            <select className={inputClass} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                                {data.channels.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Audience</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {data.segments.map((s) => (
                                    <label key={s.key}
                                        className={`flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-sm cursor-pointer
                                            ${segment === s.key ? "border-brand bg-brand/5" : "border-hairline"}`}>
                                        <span className="flex items-center gap-2 min-w-0">
                                            <input type="radio" name="seg" checked={segment === s.key}
                                                onChange={() => setSegment(s.key)} />
                                            <span className="truncate">{s.label}</span>
                                        </span>
                                        <span className="text-xs text-ink-subtle num shrink-0">{s.reachable}/{s.total}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-ink-subtle mt-1">reachable / total — only devices with the app installed receive it.</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="ghost" icon={LuBell} loading={sending === "test"} onClick={() => send(true)}>
                                Send test to me
                            </Button>
                            <Button icon={LuSend} loading={sending === "live"} onClick={() => send(false)}>
                                Send broadcast
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card padded className="h-max">
                    <h3 className="font-semibold text-ink mb-3 text-sm">Recent broadcasts</h3>
                    {data.history.length === 0 ? (
                        <p className="text-sm text-ink-subtle">Nothing sent yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {data.history.map((h) => (
                                <li key={h.id} className="text-sm border-b border-hairline pb-2 last:border-0">
                                    <p className="font-medium text-ink">{h.title}</p>
                                    <p className="text-ink-muted text-xs line-clamp-2">{h.body}</p>
                                    <p className="text-ink-subtle text-xs mt-1 num">
                                        {h.segment} · {h.recipients} · {new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        {h.by ? ` · ${h.by}` : ""}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}
