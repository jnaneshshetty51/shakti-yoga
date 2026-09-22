"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft, LuCalendar, LuUserCheck, LuMessageCircle, LuPhoneCall, LuCalendarCheck } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge, ErrorState, inputClass, labelClass } from "@/components/admin/ui";
import { ActivityTimeline, type Activity } from "@/components/admin/ActivityTimeline";
import { useToast } from "@/components/admin/Toast";
import { WhatsAppTemplateModal } from "@/components/admin/crm/WhatsAppTemplateModal";
import { QuickLogModal } from "@/components/admin/crm/QuickLogModal";

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

    // Modals
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
    const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
    const [trialModalOpen, setTrialModalOpen] = useState(false);
    const [trialDateInput, setTrialDateInput] = useState("");

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

    const handleSnoozeFollowUp = async (daysAhead: number) => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);
        await updateLeadField({ nextFollowUpAt: targetDate.toISOString() });
    };

    const handleScheduleTrial = async () => {
        if (!trialDateInput) {
            showToast('error', 'Please choose a trial date');
            return;
        }
        setUpdating(true);
        try {
            const trialIso = new Date(trialDateInput).toISOString();
            await fetch(`/api/admin/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'TRIAL',
                    trialDate: trialIso,
                    trialRequestedAt: new Date().toISOString(),
                }),
            });
            await fetch(`/api/admin/leads/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'NOTE',
                    content: `Trial scheduled for ${new Date(trialDateInput).toLocaleDateString('en-IN')}`,
                }),
            });
            showToast('success', 'Trial scheduled successfully');
            setTrialModalOpen(false);
            await load();
        } catch {
            showToast('error', 'Failed to schedule trial');
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
            {/* WhatsApp Template Modal */}
            <WhatsAppTemplateModal
                lead={lead}
                isOpen={isWhatsAppOpen}
                onClose={() => setIsWhatsAppOpen(false)}
                onLogged={load}
            />

            {/* Quick Log Modal */}
            <QuickLogModal
                lead={lead}
                isOpen={isQuickLogOpen}
                onClose={() => setIsQuickLogOpen(false)}
                onSuccess={load}
            />

            {/* Quick Trial Scheduling Modal */}
            {trialModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setTrialModalOpen(false)}>
                    <div className="bg-surface border border-hairline rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <LuCalendarCheck className="w-5 h-5 text-terracotta" />
                            <h3 className="font-bold text-sm text-ink">Schedule Trial Session</h3>
                        </div>
                        <p className="text-xs text-ink-subtle">
                            Sets {lead.name}&apos;s trial session date and automatically advances the pipeline stage to Trial.
                        </p>
                        <div>
                            <label className={labelClass}>Trial Session Date</label>
                            <input
                                type="date"
                                value={trialDateInput}
                                onChange={(e) => setTrialDateInput(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setTrialModalOpen(false)}
                                className="px-3 py-1.5 text-xs text-ink-subtle hover:text-ink"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={updating}
                                onClick={handleScheduleTrial}
                                className="px-4 py-1.5 rounded-control bg-brand text-white text-xs font-semibold hover:bg-brand-strong"
                            >
                                Confirm Trial
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    {/* Quick Touch Button */}
                    <button
                        type="button"
                        onClick={() => setIsQuickLogOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-control bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-colors"
                    >
                        <LuPhoneCall className="w-3.5 h-3.5" /> Quick Touch Log
                    </button>

                    {/* Schedule Trial Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setTrialDateInput(new Date().toISOString().slice(0, 10));
                            setTrialModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-control bg-terracotta/10 text-terracotta border border-terracotta/20 hover:bg-terracotta/20 transition-colors"
                    >
                        <LuCalendarCheck className="w-3.5 h-3.5" /> Schedule Trial
                    </button>

                    {/* Owner Assign */}
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

                    {/* Follow-up with snooze */}
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
                        <button
                            type="button"
                            title="Snooze 1 day"
                            onClick={() => handleSnoozeFollowUp(1)}
                            className="px-1.5 py-0.5 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink text-[11px]"
                        >
                            +1d
                        </button>
                        <button
                            type="button"
                            title="Snooze 3 days"
                            onClick={() => handleSnoozeFollowUp(3)}
                            className="px-1.5 py-0.5 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink text-[11px]"
                        >
                            +3d
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padded>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-ink text-sm">Lead Details</h3>
                        {lead.phone && (
                            <button
                                type="button"
                                onClick={() => setIsWhatsAppOpen(true)}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-control bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition-colors"
                            >
                                <LuMessageCircle className="w-3.5 h-3.5" /> WhatsApp Studio Templates
                            </button>
                        )}
                    </div>
                    <dl className="text-sm grid grid-cols-2 gap-y-2">
                        <dt className="text-ink-subtle">Phone</dt>
                        <dd>
                            {lead.phone ? (
                                <div className="flex items-center gap-2">
                                    <span>{lead.phone}</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsWhatsAppOpen(true)}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                                        title="Chat on WhatsApp"
                                    >
                                        <LuMessageCircle className="w-3.5 h-3.5" />
                                        WhatsApp
                                    </button>
                                </div>
                            ) : (
                                "—"
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Country</dt><dd>{lead.country || "—"}</dd>
                        <dt className="text-ink-subtle">Program interest</dt><dd>{lead.programInterest ? lead.programInterest.replace(/_/g, " ") : "—"}</dd>
                        <dt className="text-ink-subtle">Campaign</dt><dd>{lead.campaign || "—"}</dd>
                        <dt className="text-ink-subtle">Assigned to</dt><dd>{lead.assignedTo?.name || "Unassigned"}</dd>
                        <dt className="text-ink-subtle">Next follow-up</dt><dd>{d(lead.nextFollowUpAt)}</dd>
                        <dt className="text-ink-subtle">Trial date</dt>
                        <dd>
                            {lead.trialDate ? (
                                <span className="font-semibold text-terracotta">{d(lead.trialDate)}</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTrialDateInput(new Date().toISOString().slice(0, 10));
                                        setTrialModalOpen(true);
                                    }}
                                    className="text-xs text-brand hover:underline font-medium"
                                >
                                    + Schedule trial
                                </button>
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Trial attended</dt>
                        <dd>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={lead.trialAttended}
                                    onChange={(e) => updateLeadField({ trialAttended: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded text-brand focus:ring-brand"
                                />
                                <span className="text-xs">{lead.trialAttended ? "Yes — Attended" : "No"}</span>
                            </label>
                        </dd>
                        <dt className="text-ink-subtle">Created</dt><dd>{d(lead.createdAt)}</dd>
                        <dt className="text-ink-subtle">Account linked</dt>
                        <dd>
                            {lead.linkedUserId ? (
                                <Link href={`/admin/members/${lead.linkedUserId}`} className="text-xs font-semibold text-brand hover:text-brand-strong inline-flex items-center gap-1">
                                    Yes — View Member &rarr;
                                </Link>
                            ) : (
                                "No"
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Converted (paid)</dt>
                        <dd>
                            {lead.convertedAt ? (
                                <span className="font-semibold text-emerald-600">Yes ({d(lead.convertedAt)})</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>No</span>
                                    <Link href={`/admin/finance?tab=payments&userId=${lead.linkedUserId || ""}&email=${encodeURIComponent(lead.email)}`}>
                                        <span className="text-xs text-brand hover:text-brand-strong font-medium underline">
                                            Record payment &rarr;
                                        </span>
                                    </Link>
                                </div>
                            )}
                        </dd>
                    </dl>
                    {lead.notes && <p className="text-sm mt-3 pt-3 border-t border-hairline"><span className="text-ink-subtle font-medium">Notes: </span>{lead.notes}</p>}
                </Card>

                <ActivityTimeline endpoint={`/api/admin/leads/${id}`} activities={lead.activities} onLogged={load} />
            </div>
        </div>
    );
}
