"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge } from "@/components/admin/ui";
import { ActivityTimeline, type Activity } from "@/components/admin/ActivityTimeline";

type Lead = {
    id: string; name: string; email: string; phone: string | null; country: string | null;
    source: string; status: string; notes: string | null;
    trialDate: string | null; trialAttended: boolean;
    convertedToUserId: string | null; convertedAt: string | null;
    assignedTo: { id: string; name: string } | null;
    createdAt: string;
    activities: Activity[];
};

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [lead, setLead] = useState<Lead | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/leads/${id}`);
        if (res.ok) setLead((await res.json()).lead);
    }, [id]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    if (!lead) return <PageLoading title="Lead" />;

    return (
        <div>
            <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Leads
            </Link>
            <PageHeader
                title={lead.name}
                subtitle={lead.email}
                eyebrow={<span className="flex gap-2"><Badge tone="gray">{lead.status.toLowerCase()}</Badge><Badge tone="blue">{lead.source.replace(/_/g, " ").toLowerCase()}</Badge></span>}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Details</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt><dd>{lead.phone || "—"}</dd>
                        <dt className="text-ink-subtle">Country</dt><dd>{lead.country || "—"}</dd>
                        <dt className="text-ink-subtle">Assigned to</dt><dd>{lead.assignedTo?.name || "—"}</dd>
                        <dt className="text-ink-subtle">Trial date</dt><dd>{d(lead.trialDate)}</dd>
                        <dt className="text-ink-subtle">Trial attended</dt><dd>{lead.trialAttended ? "Yes" : "No"}</dd>
                        <dt className="text-ink-subtle">Created</dt><dd>{d(lead.createdAt)}</dd>
                        <dt className="text-ink-subtle">Converted</dt><dd>{lead.convertedAt ? d(lead.convertedAt) : "No"}</dd>
                    </dl>
                    {lead.notes && <p className="text-sm mt-3"><span className="text-ink-subtle">Notes: </span>{lead.notes}</p>}
                </Card>

                <ActivityTimeline endpoint={`/api/admin/leads/${id}`} activities={lead.activities} onLogged={load} />
            </div>
        </div>
    );
}
