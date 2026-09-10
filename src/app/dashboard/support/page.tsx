"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuLifeBuoy, LuSend } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Button, Badge } from "@/components/ui";

interface Message {
    id: string;
    senderRole: string;
    body: string;
    createdAt: string;
}

interface Conversation {
    id: string;
    subject: string | null;
    status: "OPEN" | "CLOSED";
    messages: Message[];
}

export default function SupportPage() {
    const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
    const [subject, setSubject] = useState("");
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/support", { cache: "no-store" });
        const data = await res.json();
        setConversation(data.conversation ?? null);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversation?.messages.length]);

    const startConversation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: subject.trim() || null, message: draft.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not start conversation");
            setConversation(data.conversation);
            setDraft(""); setSubject("");
        } catch (e2) {
            setError(e2 instanceof Error ? e2.message : "Could not start conversation");
        } finally {
            setBusy(false);
        }
    };

    const reply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || !conversation) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/support/${conversation.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: draft.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not send message");
            setConversation(data.conversation);
            setDraft("");
        } catch (e2) {
            setError(e2 instanceof Error ? e2.message : "Could not send message");
        } finally {
            setBusy(false);
        }
    };

    if (conversation === undefined) return <PageLoading title="Support" />;

    const isOpen = conversation?.status === "OPEN";

    return (
        <div className="max-w-2xl">
            <PageHeader title="Support" subtitle="Ask us anything — a real person from the Shakti team will reply here." />

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

            {conversation && (
                <Card padded className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-800">{conversation.subject || "Your conversation"}</span>
                        <Badge tone={isOpen ? "blue" : "gray"}>{isOpen ? "Open" : "Closed"}</Badge>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {conversation.messages.map((m) => (
                            <div key={m.id} className={`flex ${m.senderRole === "member" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                    m.senderRole === "member" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                                }`}>
                                    {m.body}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </Card>
            )}

            {!conversation || !isOpen ? (
                <Card padded>
                    {conversation && !isOpen && (
                        <p className="text-sm text-gray-500 mb-3">
                            That conversation is closed. Start a new one below.
                        </p>
                    )}
                    <form onSubmit={startConversation} className="space-y-3">
                        <input
                            placeholder="Subject (optional)"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <textarea
                            required
                            placeholder="How can we help?"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <Button type="submit" disabled={busy} icon={LuLifeBuoy}>
                            {busy ? "Sending…" : "Start conversation"}
                        </Button>
                    </form>
                </Card>
            ) : (
                <form onSubmit={reply} className="flex gap-2">
                    <input
                        placeholder="Type a message…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button type="submit" disabled={busy || !draft.trim()} icon={LuSend} />
                </form>
            )}
        </div>
    );
}
