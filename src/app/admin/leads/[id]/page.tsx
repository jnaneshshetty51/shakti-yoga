"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft, LuCalendar, LuUserCheck } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge, ErrorState, Button, inputClass, labelClass } from "@/components/admin/ui";
import { ActivityTimeline, type Activity } from "@/components/admin/ActivityTimeline";
import { useToast } from "@/components/admin/Toast";

type Lead = {
    id: string; name: string; email: string; phone: string | null; country: string | null;
    source: string; status: string; notes: string | null;
    programInterest: string | null; campaign: string | null; nextFollowUpAt: string | null;
    trialDate: string | null; trialAttended: boolean;
    linkedUserId: string | null;
    convertedToUserId: string | null; convertedAt: string | null;
    assignedTo: { id: string; name: string } | null;
    createdAt: string;
    activities: Activity[];
};

const STATUS_OPTIONS = [
    { value: 'NEW', label: 'New', tone: 'blue' as const },
    { value: 'CONTACTED', label: 'Contacted', tone: 'amber' as const },
    { value: 'TRIAL', label: 'Trial', tone: 'purple' as const },
    { value: 'CONVERTED', label: 'Converted', tone: 'green' as const },
    { value: 'LOST', label: 'Lost', tone: 'red' as const },
];

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
    const [updating, setUpdating] = useState(false);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/admin/leads/${id}`);
            if (res.ok) {
                setLead((await res.json()).lead);
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch('/api/admin/staff')
            .then((r) => (r.ok ? r.json() : { staff: [] }))
            .then((d) => setStaffList((d.staff || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
            .catch(() => {});
    }, []);

    const updateLeadField = async (fieldData: Record<string, unknown>) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });
            if (res.ok) {
                showToast('success', 'Lead updated');
                await load();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast('error', err.error || 'Failed to update lead');
            }
        } catch {
            showToast('error', 'Network error while updating lead');
        } finally {
            setUpdating(false);
        }
    };

    if (loadError) {
        return (
            <div>
                <Link href="/admin/crm?tab=leads" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                    <LuArrowLeft /> Leads
                </Link>
                <ErrorState message="Could not load this lead." onRetry={load} />
            </div>
        );
    }

    if (!lead) return <PageLoading title="Lead" />;

    const currentStatus = STATUS_OPTIONS.find((s) => s.value === lead.status) || STATUS_OPTIONS[0];

    return (
        <div>
            <Link href="/admin/crm?tab=leads" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Leads
            </Link>
            <PageHeader
                title={lead.name}
                subtitle={lead.email}
                eyebrow={<span className="flex gap-2"><Badge tone={currentStatus.tone}>{currentStatus.label}</Badge><Badge tone="blue">{lead.source.replace(/_/g, " ").toLowerCase()}</Badge></span>}
            />

            {/* Quick Action Bar for Sales & Support */}
            <div className="mb-6 p-4 rounded-xl border border-hairline bg-surface flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Pipeline Stage:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s.value}
                                disabled={updating || lead.status === s.value}
                                onClick={() => updateLeadField({ status: s.value })}
                                className={`px-2.5 py-1 text-xs font-medium rounded-control border transition-all ${
                                    lead.status === s.value
                                        ? "bg-brand text-white border-brand shadow-sm"
                                        : "bg-surface-raised border-hairline text-ink hover:border-brand/40"
                                } disabled:opacity-50`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                        <LuUserCheck className="w-3.5 h-3.5 text-brand" />
                        <span>Owner:</span>
                        <select
                            disabled={updating}
                            value={lead.assignedTo?.id || ""}
                            onChange={(e) => updateLeadField({ assignedToId: e.target.value })}
                            className="text-xs rounded-control border border-hairline bg-surface px-2 py-1 text-ink focus:outline-none focus:border-brand"
                        >
                            <option value="">Unassigned</option>
                            {staffList.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                        <LuCalendar className="w-3.5 h-3.5 text-brand" />
                        <span>Follow-up:</span>
                        <input
                            type="date"
                            disabled={updating}
                            defaultValue={lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toISOString().split('T')[0] : ""}
                            onChange={(e) => updateLeadField({ nextFollowUpAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            className="text-xs rounded-control border border-hairline bg-surface px-2 py-1 text-ink focus:outline-none focus:border-brand"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Lead Details</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt><dd>{lead.phone || "—"}</dd>
                        <dt className="text-ink-subtle">Country</dt><dd>{lead.country || "—"}</dd>
                        <dt className="text-ink-subtle">Program interest</dt><dd>{lead.programInterest ? lead.programInterest.replace(/_/g, " ") : "—"}</dd>
                        <dt className="text-ink-subtle">Campaign</dt><dd>{lead.campaign || "—"}</dd>
                        <dt className="text-ink-subtle">Assigned to</dt><dd>{lead.assignedTo?.name || "Unassigned"}</dd>
                        <dt className="text-ink-subtle">Next follow-up</dt><dd>{d(lead.nextFollowUpAt)}</dd>
                        <dt className="text-ink-subtle">Trial date</dt><dd>{d(lead.trialDate)}</dd>
                        <dt className="text-ink-subtle">Trial attended</dt><dd>{lead.trialAttended ? "Yes" : "No"}</dd>
                        <dt className="text-ink-subtle">Created</dt><dd>{d(lead.createdAt)}</dd>
                        <dt className="text-ink-subtle">Account linked</dt><dd>{lead.linkedUserId ? "Yes — signed up" : "No"}</dd>
                        <dt className="text-ink-subtle">Converted (paid)</dt><dd>{lead.convertedAt ? d(lead.convertedAt) : "No"}</dd>
                    </dl>
                    {lead.notes && <p className="text-sm mt-3 pt-3 border-t border-hairline"><span className="text-ink-subtle font-medium">Notes: </span>{lead.notes}</p>}
                </Card>

                <ActivityTimeline endpoint={`/api/admin/leads/${id}`} activities={lead.activities} onLogged={load} />
            </div>
        </div>
    );
}
