"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, PageLoading, Card } from "@/components/admin/ui";

type Member = { id: string; name: string; email: string; lastLogin: string | null; plan: string | null; renewal: string | null };
type Seg = { key: string; label: string; total: number; members: Member[] };

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const BROADCAST_SEG: Record<string, string> = { inactive: "inactive", at_risk: "at_risk", renewing: "everyday", failed: "all" };

export default function RetentionPage() {
    const [segs, setSegs] = useState<Seg[] | null>(null);
    const [open, setOpen] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/admin/retention");
            if (res.ok) setSegs((await res.json()).segments);
        })();
    }, []);

    if (!segs) return <PageLoading title="Retention" />;

    return (
        <div>
            <PageHeader title="Retention" subtitle="Members who need attention. Message a whole segment from Broadcast." />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                {segs.map((s) => (
                    <Card key={s.key} padded interactive className="cursor-pointer" >
                        <button className="text-left w-full" onClick={() => setOpen(open === s.key ? null : s.key)}>
                            <p className="text-xs uppercase tracking-wide text-ink-subtle">{s.label}</p>
                            <p className="text-3xl font-bold text-ink mt-1">{s.total}</p>
                        </button>
                        {BROADCAST_SEG[s.key] && (
                            <Link href={`/admin/broadcast`} className="text-xs font-semibold text-brand mt-2 inline-block">Message segment →</Link>
                        )}
                    </Card>
                ))}
            </div>

            {open && (() => {
                const s = segs.find((x) => x.key === open)!;
                return (
                    <Card padded>
                        <h3 className="font-semibold text-ink mb-3 text-sm">{s.label} · showing {s.members.length} of {s.total}</h3>
                        <ul className="divide-y divide-hairline text-sm">
                            {s.members.map((m) => (
                                <li key={m.id} className="flex items-center justify-between py-2">
                                    <Link href={`/admin/members/${m.id}`} className="hover:underline">
                                        {m.name} <span className="text-ink-subtle">· {m.email}</span>
                                    </Link>
                                    <span className="text-xs text-ink-subtle">
                                        {m.plan ? `${m.plan.replace(/_/g, " ").toLowerCase()} · ` : ""}
                                        {s.key === "renewing" ? `renews ${d(m.renewal)}` : `last seen ${d(m.lastLogin)}`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                );
            })()}
        </div>
    );
}
