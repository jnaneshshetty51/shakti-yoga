"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";
import { PageHeader, Card } from "@/components/admin/ui";

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
    const [loadError, setLoadError] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [f, setF] = useState({ entity: "", action: "", actor: "", from: "", to: "" });

    const qs = useCallback(() => {
        const p = new URLSearchParams();
        Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
        return p;
    }, [f]);

    const load = useCallback(async (after?: string | null) => {
        setLoading(true);
        setLoadError(false);
        try {
            const p = qs();
            if (after) p.set("cursor", after);
            const res = await fetch(`/api/admin/audit?${p.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setRows((prev) => (after ? [...prev, ...data.logs] : data.logs));
                setCursor(data.nextCursor);
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [qs]);

    useEffect(() => { load(); }, [load]);

    const input = "rounded-control border border-hairline px-2 py-1.5 text-sm";

    return (
        <div className="max-w-5xl">
            <PageHeader
                title="Audit Log"
                subtitle="Every privileged change — role, subscription, credits, class, Meet link, deletions."
            >
                <a href={`/api/admin/audit?format=csv&${qs().toString()}`} className="text-sm font-semibold text-brand hover:text-brand-strong">Export CSV</a>
            </PageHeader>

            <div className="flex flex-wrap gap-2 mb-4">
                <input className={input} placeholder="entity (User, Payment…)" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} />
                <input className={input} placeholder="action prefix (subscription.)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
                <input className={input} placeholder="actor email" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })} />
                <input className={input} type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
                <input className={input} type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
                {(f.entity || f.action || f.actor || f.from || f.to) && (
                    <button className="text-sm text-ink-subtle hover:text-ink" onClick={() => setF({ entity: "", action: "", actor: "", from: "", to: "" })}>clear</button>
                )}
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/70 text-left text-[11px] uppercase tracking-wider text-gray-400">
                                <th className="px-4 py-3 font-semibold">When</th>
                                <th className="px-4 py-3 font-semibold">Actor</th>
                                <th className="px-4 py-3 font-semibold">Action</th>
                                <th className="px-4 py-3 font-semibold">Target</th>
                                <th className="px-4 py-3 font-semibold"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && !loading && loadError && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                    Could not load the audit log.
                                    <button onClick={() => load()} className="ml-2 text-primary font-medium hover:underline">Retry</button>
                                </td></tr>
                            )}
                            {rows.length === 0 && !loading && !loadError && (
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
            </Card>

            {cursor && (
                <button
                    onClick={() => load(cursor)}
                    disabled={loading}
                    className="mt-4 px-5 py-2 text-sm rounded-full border border-gray-200 bg-white font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                    {loading ? "Loading…" : "Load more"}
                </button>
            )}
        </div>
    );
}
