"use client";

import { useCallback, useEffect, useState } from "react";
import { LuInbox } from "react-icons/lu";
import { PageHeader, PageLoading, Card, EmptyState, ErrorState, ActionButton } from "@/components/admin/ui";

interface Message {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    handled: boolean;
    createdAt: string;
}

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [showHandled, setShowHandled] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/contact");
            if (res.ok) {
                setMessages((await res.json()).messages || []);
                setLoadError(false);
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setHandled = async (id: string, handled: boolean) => {
        await fetch("/api/admin/contact", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, handled }),
        });
        load();
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this message?")) return;
        await fetch(`/api/admin/contact?id=${id}`, { method: "DELETE" });
        load();
    };

    if (loading) return <PageLoading title="Contact Inquiries" />;

    const visible = messages.filter((m) => showHandled || !m.handled);

    return (
        <div>
            <PageHeader title="Contact Inquiries" subtitle="Website contact form submissions, general inquiries, and prospective student questions.">
                <label className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2 rounded-full border border-gray-200 bg-white cursor-pointer">
                    <input type="checkbox" className="accent-primary" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
                    Show handled
                </label>
            </PageHeader>

            {loadError ? (
                <ErrorState message="Could not load inquiries." onRetry={load} />
            ) : visible.length === 0 ? (
                <Card><EmptyState icon={LuInbox} title="No inquiries" hint="New contact-form enquiries from website visitors will appear here." /></Card>
            ) : (
                <div className="space-y-4">
                    {visible.map((m) => (
                        <Card
                            key={m.id}
                            padded
                            className={m.handled ? "opacity-70" : "border-primary/15"}
                        >
                            <div className="flex justify-between items-start mb-3 gap-4">
                                <div>
                                    <div className="font-bold text-gray-800">{m.name}</div>
                                    <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline">{m.email}</a>
                                    {m.subject && <span className="ml-3 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{m.subject}</span>}
                                </div>
                                <div className="text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(m.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{m.message}</p>
                            <div className="flex gap-4">
                                <ActionButton onClick={() => setHandled(m.id, !m.handled)}>
                                    {m.handled ? "Mark unhandled" : "Mark handled"}
                                </ActionButton>
                                <ActionButton tone="danger" onClick={() => remove(m.id)}>Delete</ActionButton>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
