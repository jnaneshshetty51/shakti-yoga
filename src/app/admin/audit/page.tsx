"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";

interface Row {
    id: string;
    at: string;
    actor: string;
    action: string;
    entity: string;
    entityId: string | null;
    before: unknown;
    after: unknown;
    ip: string | null;
}

function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
}

export default function AuditLogPage() {
    return (
        <SuperAdminGuard>
            <AuditLogInner />
        </SuperAdminGuard>
    );
}

function AuditLogInner() {
    const [rows, setRows] = useState<Row[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async (after?: string | null) => {
        setLoading(true);
        try {
            const url = new URL("/api/admin/audit", window.location.origin);
            if (after) url.searchParams.set("cursor", after);
            const res = await fetch(url.toString().replace(window.location.origin, ""));
            const data = await res.json();
            if (res.ok) {
                setRows((prev) => (after ? [...prev, ...data.logs] : data.logs));
                setCursor(data.nextCursor);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="p-4 sm:p-8 max-w-5xl">
            <h1 className="font-serif text-2xl sm:text-3xl text-primary mb-1">Audit Log</h1>
            <p className="text-sm text-gray-500 mb-6">Every privileged change — role, subscription, credits, class, Meet link, deletions.</p>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-400">
                                <th className="px-4 py-3 font-medium">When</th>
                                <th className="px-4 py-3 font-medium">Actor</th>
                                <th className="px-4 py-3 font-medium">Action</th>
                                <th className="px-4 py-3 font-medium">Target</th>
                                <th className="px-4 py-3 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 italic">No entries yet.</td></tr>
                            )}
                            {rows.map((r) => (
                                <Fragment key={r.id}>
                                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 tabular-nums">{fmt(r.at)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{r.actor}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-700">{r.action}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                            {r.entity}{r.entityId ? <span className="text-gray-300"> · {r.entityId.slice(0, 8)}</span> : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(r.before != null || r.after != null) && (
                                                <button
                                                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                                                    className="text-xs text-primary font-medium hover:underline"
                                                >
                                                    {expanded === r.id ? "hide" : "diff"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expanded === r.id && (
                                        <tr className="bg-gray-50 border-t border-gray-100">
                                            <td colSpan={5} className="px-4 py-3">
                                                <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
                                                    <div>
                                                        <div className="text-gray-400 uppercase tracking-wider mb-1">Before</div>
                                                        <pre className="whitespace-pre-wrap text-gray-600">{JSON.stringify(r.before, null, 2)}</pre>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 uppercase tracking-wider mb-1">After</div>
                                                        <pre className="whitespace-pre-wrap text-gray-600">{JSON.stringify(r.after, null, 2)}</pre>
                                                    </div>
                                                </div>
                                                {r.ip && <div className="text-[11px] text-gray-400 mt-2">from {r.ip}</div>}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {cursor && (
                <button
                    onClick={() => load(cursor)}
                    disabled={loading}
                    className="mt-4 px-5 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                    {loading ? "Loading…" : "Load more"}
                </button>
            )}
        </div>
    );
}
