"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft, LuUserCheck, LuIndianRupee, LuMessageCircle } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge, ErrorState } from "@/components/admin/ui";
import { ActivityTimeline, type Activity } from "@/components/admin/ActivityTimeline";
import { useToast } from "@/components/admin/Toast";

type Lead = {
    id: string; companyName: string; contactName: string; contactEmail: string; contactPhone: string | null;
    employeeCount: number | null; requirement: string | null; programInterest: string | null; campaign: string | null; message: string | null;
    status: string; dealValue: number | null; notes: string | null;
    assignedTo: { id: string; name: string } | null;
    createdAt: string;
    activities: Activity[];
};

const STAGES = [
    { value: 'NEW', label: 'New', tone: 'blue' as const },
    { value: 'CONTACTED', label: 'Contacted', tone: 'amber' as const },
    { value: 'DISCUSSION', label: 'Discussion', tone: 'amber' as const },
    { value: 'PROPOSAL', label: 'Proposal', tone: 'purple' as const },
    { value: 'CONFIRMED', label: 'Confirmed', tone: 'green' as const },
    { value: 'PAYMENT', label: 'Payment', tone: 'green' as const },
    { value: 'COMPLETED', label: 'Completed', tone: 'green' as const },
    { value: 'LOST', label: 'Lost', tone: 'red' as const },
];

const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n));

export default function CorporateDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
    const [updating, setUpdating] = useState(false);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/admin/corporate/${id}`);
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
            const res = await fetch(`/api/admin/corporate/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });
            if (res.ok) {
                showToast('success', 'Corporate deal updated');
                await load();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast('error', err.error || 'Failed to update deal');
            }
        } catch {
            showToast('error', 'Network error while updating deal');
        } finally {
            setUpdating(false);
        }
    };

    if (loadError) {
        return (
            <div>
                <Link href="/admin/crm?tab=corporate" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                    <LuArrowLeft /> Corporate
                </Link>
                <ErrorState message="Could not load this lead." onRetry={load} />
            </div>
        );
    }

    if (!lead) return <PageLoading title="Corporate lead" />;

    const currentStage = STAGES.find((s) => s.value === lead.status) || STAGES[0];

    return (
        <div>
            <Link href="/admin/crm?tab=corporate" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Corporate
            </Link>
            <PageHeader
                title={lead.companyName}
                subtitle={`${lead.contactName} · ${lead.contactEmail}`}
                eyebrow={<Badge tone={currentStage.tone}>{currentStage.label}</Badge>}
            />

            {/* Pipeline Stage & Deal Management Bar */}
            <div className="mb-6 p-4 rounded-xl border border-hairline bg-surface flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Deal Stage:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {STAGES.map((s) => (
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
                        <LuIndianRupee className="w-3.5 h-3.5 text-brand" />
                        <span>Deal value:</span>
                        <input
                            type="number"
                            disabled={updating}
                            defaultValue={lead.dealValue ?? ""}
                            onBlur={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                if (val !== lead.dealValue) {
                                    updateLeadField({ dealValue: val });
                                }
                            }}
                            placeholder="₹ amount"
                            className="w-24 text-xs rounded-control border border-hairline bg-surface px-2 py-1 text-ink focus:outline-none focus:border-brand"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Details</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt>
                        <dd>
                            {lead.contactPhone ? (
                                <div className="flex items-center gap-2">
                                    <span>{lead.contactPhone}</span>
                                    <a
                                        href={`https://wa.me/${lead.contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${lead.contactName}, this is from Shakthi Yoga. Reaching out regarding corporate wellness for ${lead.companyName}!`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                                        title="Chat on WhatsApp"
                                    >
                                        <LuMessageCircle className="w-3.5 h-3.5" />
                                        WhatsApp
                                    </a>
                                </div>
                            ) : (
                                "—"
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Employees</dt><dd>{lead.employeeCount ?? "—"}</dd>
                        <dt className="text-ink-subtle">Programme</dt><dd>{lead.programInterest || "—"}</dd>
                        <dt className="text-ink-subtle">Campaign</dt><dd>{lead.campaign || "—"}</dd>
                        <dt className="text-ink-subtle">Deal value</dt>
                        <dd>
                            {money(lead.dealValue)}
                            {lead.dealValue != null && (
                                <span className="text-ink-subtle text-xs ml-1" title="Entered by an admin — not reconciled against an actual payment or invoice.">(unverified)</span>
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Assigned to</dt><dd>{lead.assignedTo?.name || "Unassigned"}</dd>
                        <dt className="text-ink-subtle">Created</dt><dd>{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
                    </dl>
                    {lead.requirement && <p className="text-sm mt-3 pt-3 border-t border-hairline"><span className="text-ink-subtle font-medium">Requirement: </span>{lead.requirement}</p>}
                    {lead.message && <p className="text-sm mt-2"><span className="text-ink-subtle font-medium">Message: </span>{lead.message}</p>}
                    {lead.notes && <p className="text-sm mt-2"><span className="text-ink-subtle font-medium">Notes: </span>{lead.notes}</p>}
                </Card>

                <ActivityTimeline endpoint={`/api/admin/corporate/${id}`} activities={lead.activities} onLogged={load} />
            </div>
        </div>
    );
}
