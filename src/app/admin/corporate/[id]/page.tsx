"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge } from "@/components/admin/ui";
import { ActivityTimeline, type Activity } from "@/components/admin/ActivityTimeline";

type Lead = {
    id: string; companyName: string; contactName: string; contactEmail: string; contactPhone: string | null;
    employeeCount: number | null; requirement: string | null; programInterest: string | null; message: string | null;
    status: string; dealValue: number | null; notes: string | null;
    assignedTo: { id: string; name: string } | null;
    createdAt: string;
    activities: Activity[];
};

const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n));

export default function CorporateDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [lead, setLead] = useState<Lead | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/corporate/${id}`);
        if (res.ok) setLead((await res.json()).lead);
    }, [id]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    if (!lead) return <PageLoading title="Corporate lead" />;

    return (
        <div>
            <Link href="/admin/corporate" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Corporate
            </Link>
            <PageHeader
                title={lead.companyName}
                subtitle={`${lead.contactName} · ${lead.contactEmail}`}
                eyebrow={<Badge tone="gray">{lead.status.toLowerCase()}</Badge>}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Details</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt><dd>{lead.contactPhone || "—"}</dd>
                        <dt className="text-ink-subtle">Employees</dt><dd>{lead.employeeCount ?? "—"}</dd>
                        <dt className="text-ink-subtle">Programme</dt><dd>{lead.programInterest || "—"}</dd>
                        <dt className="text-ink-subtle">Deal value</dt><dd>{money(lead.dealValue)}</dd>
                        <dt className="text-ink-subtle">Assigned to</dt><dd>{lead.assignedTo?.name || "—"}</dd>
                        <dt className="text-ink-subtle">Created</dt><dd>{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
                    </dl>
                    {lead.requirement && <p className="text-sm mt-3"><span className="text-ink-subtle">Requirement: </span>{lead.requirement}</p>}
                    {lead.message && <p className="text-sm mt-2"><span className="text-ink-subtle">Message: </span>{lead.message}</p>}
                    {lead.notes && <p className="text-sm mt-2"><span className="text-ink-subtle">Notes: </span>{lead.notes}</p>}
                </Card>

                <ActivityTimeline endpoint={`/api/admin/corporate/${id}`} activities={lead.activities} onLogged={load} />
            </div>
        </div>
    );
}
