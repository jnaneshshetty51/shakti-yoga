"use client";

import { useCallback, useEffect, useState } from "react";

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
    const [showHandled, setShowHandled] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/contact");
            if (res.ok) setMessages((await res.json()).messages || []);
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

    if (loading) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Messages</h1>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const visible = messages.filter((m) => showHandled || !m.handled);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Messages</h1>
                    <p className="text-gray-500">Enquiries submitted through the contact form.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
                    Show handled
                </label>
            </div>

            {visible.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-400">
                    No messages.
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((m) => (
                        <div
                            key={m.id}
                            className={`bg-white p-6 rounded-lg shadow-sm border ${m.handled ? "border-gray-100 opacity-70" : "border-primary/10"}`}
                        >
                            <div className="flex justify-between items-start mb-3 gap-4">
                                <div>
                                    <div className="font-bold text-gray-800">{m.name}</div>
                                    <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline">{m.email}</a>
                                    {m.subject && <span className="ml-3 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{m.subject}</span>}
                                </div>
                                <div className="text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(m.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{m.message}</p>
                            <div className="flex gap-3 text-xs font-bold uppercase tracking-wider">
                                <button
                                    onClick={() => setHandled(m.id, !m.handled)}
                                    className="text-primary hover:text-secondary"
                                >
                                    {m.handled ? "Mark unhandled" : "Mark handled"}
                                </button>
                                <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
