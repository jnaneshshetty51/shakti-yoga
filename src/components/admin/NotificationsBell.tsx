"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuBell, LuCheck, LuTriangleAlert, LuInfo, LuX } from "react-icons/lu";

interface Notification {
    id: string;
    kind: "alert" | "info";
    severity: "high" | "medium" | "low";
    title: string;
    body?: string;
    href: string;
    at: string;
    read: boolean;
}

interface Payload {
    items: Notification[];
    unreadCount: number;
    seenAt: string | null;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return "";
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const SEV_DOT: Record<Notification["severity"], string> = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-gray-300",
};

export function NotificationsBell() {
    const [data, setData] = useState<Payload | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const res = await fetch("/api/admin/notifications", { signal: ac.signal, cache: "no-store" });
            if (res.ok) setData((await res.json()) as Payload);
        } catch (e) {
            if ((e as Error).name !== "AbortError") console.error("Notifications load failed:", e);
        }
    }, []);

    useEffect(() => {
        load();
        const poll = setInterval(load, 60_000);
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(poll);
            window.removeEventListener("focus", onFocus);
            abortRef.current?.abort();
        };
    }, [load]);

    // close on outside click / Escape
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const post = useCallback(
        async (payload: Record<string, unknown>) => {
            setBusy(true);
            try {
                await fetch("/api/admin/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                await load();
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    const markAllRead = () => {
        setData((d) => (d ? { ...d, unreadCount: 0, items: d.items.map((i) => ({ ...i, read: true })) } : d));
        post({ action: "markAllRead" });
    };

    const dismiss = (id: string) => {
        setData((d) =>
            d
                ? {
                    ...d,
                    items: d.items.filter((i) => i.id !== id),
                    unreadCount: Math.max(0, d.unreadCount - (d.items.find((i) => i.id === id && !i.read) ? 1 : 0)),
                }
                : d,
        );
        post({ action: "dismiss", id });
    };

    const unread = data?.unreadCount ?? 0;
    const items = data?.items ?? [];

    return (
        <div ref={rootRef} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                aria-expanded={open}
            >
                <LuBell className="w-5 h-5" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#FBFAF7]">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-xl z-50 animate-slide-up overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="font-bold text-gray-800 text-sm">
                            Notifications
                            {unread > 0 && <span className="ml-1.5 text-xs font-semibold text-gray-400">{unread} new</span>}
                        </div>
                        <button
                            onClick={markAllRead}
                            disabled={busy || unread === 0}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            <LuCheck className="text-sm" /> Mark all read
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl mb-2">
                                    <LuBell />
                                </div>
                                <p className="text-sm font-medium text-gray-700">You&rsquo;re all caught up</p>
                                <p className="text-xs text-gray-500 mt-0.5">New alerts and changes show up here.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {items.map((n) => (
                                    <li
                                        key={n.id}
                                        className={`group relative flex gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors ${n.read ? "" : "bg-primary/[0.025]"}`}
                                    >
                                        <span className="mt-1 shrink-0">
                                            {n.kind === "alert" ? (
                                                <LuTriangleAlert
                                                    className={`w-4 h-4 ${n.severity === "high" ? "text-red-500" : n.severity === "medium" ? "text-amber-500" : "text-gray-400"}`}
                                                />
                                            ) : (
                                                <LuInfo className="w-4 h-4 text-gray-400" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={n.href}
                                                onClick={() => {
                                                    setOpen(false);
                                                    if (!n.read) post({ action: "dismiss", id: n.id });
                                                }}
                                                className="block"
                                            >
                                                <p className={`text-sm leading-snug ${n.read ? "text-gray-600" : "text-gray-800 font-medium"}`}>
                                                    {n.title}
                                                </p>
                                                {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                                <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.at)}</p>
                                            </Link>
                                        </div>
                                        {!n.read && <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEV_DOT[n.severity]}`} />}
                                        <button
                                            onClick={() => dismiss(n.id)}
                                            className="absolute right-2 top-2 p-1 rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
                                            aria-label="Dismiss"
                                        >
                                            <LuX className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                        <Link
                            href="/admin/audit"
                            onClick={() => setOpen(false)}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            View full audit log →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
