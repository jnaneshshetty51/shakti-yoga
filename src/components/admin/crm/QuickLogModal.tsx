"use client";

import { useState } from "react";
import { LuPhone, LuMessageCircle, LuMail, LuFileText, LuCalendarCheck, LuX } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";

export type QuickLogLead = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    nextFollowUpAt?: string | null;
};

type Props = {
    lead: QuickLogLead | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

const ACTIVITY_TYPES = [
    { type: "CALL", label: "Phone Call", icon: LuPhone, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { type: "WHATSAPP", label: "WhatsApp", icon: LuMessageCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { type: "EMAIL", label: "Email", icon: LuMail, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { type: "NOTE", label: "Internal Note", icon: LuFileText, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { type: "TRIAL", label: "Trial Status", icon: LuCalendarCheck, color: "text-terracotta bg-terracotta/10 border-terracotta/30" },
];

const CALL_OUTCOMES = [
    "Connected — Spoke with lead",
    "No Answer / Busy",
    "Callback Requested",
    "Left Voicemail / Audio note",
    "Wrong Number / Invalid",
];

function QuickLogForm({
    lead,
    onClose,
    onSuccess,
}: {
    lead: QuickLogLead;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { showToast } = useToast();
    const [selectedType, setSelectedType] = useState("CALL");
    const [outcome, setOutcome] = useState(CALL_OUTCOMES[0]);
    const [notes, setNotes] = useState(`Phone call: ${CALL_OUTCOMES[0]}`);
    const [nextStatus, setNextStatus] = useState(lead.status === "NEW" ? "CONTACTED" : lead.status);
    const [nextFollowUpDate, setNextFollowUpDate] = useState(lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "");
    const [submitting, setSubmitting] = useState(false);

    const handleSelectType = (type: string) => {
        setSelectedType(type);
        if (type === "CALL") {
            setNotes(`Phone call: ${outcome}`);
        } else if (type === "WHATSAPP") {
            setNotes("Sent WhatsApp message regarding session options and trial.");
        } else if (type === "EMAIL") {
            setNotes("Sent email follow-up with schedule details.");
        } else if (type === "NOTE") {
            setNotes("");
        } else if (type === "TRIAL") {
            setNotes("Scheduled / confirmed trial session attendance.");
            setNextStatus("TRIAL");
        }
    };

    const handleOutcomeClick = (item: string) => {
        setOutcome(item);
        setNotes(`Phone call: ${item}`);
    };

    const handleQuickFollowUp = (daysAhead: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        setNextFollowUpDate(d.toISOString().slice(0, 10));
    };

    const handleNextMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
        d.setDate(diff);
        setNextFollowUpDate(d.toISOString().slice(0, 10));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalContent = notes.trim();
        if (!finalContent) {
            showToast("error", "Please write a brief note of what happened.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Log activity
            const actRes = await fetch(`/api/admin/leads/${lead.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: selectedType === "TRIAL" ? "NOTE" : selectedType,
                    content: finalContent,
                }),
            });

            if (!actRes.ok) {
                const err = await actRes.json().catch(() => ({}));
                throw new Error(err.error || "Failed to log activity");
            }

            // 2. Update status and/or follow-up if changed
            const updates: Record<string, unknown> = {};
            if (nextStatus && nextStatus !== lead.status) {
                updates.status = nextStatus;
            }
            if (nextFollowUpDate) {
                updates.nextFollowUpAt = new Date(nextFollowUpDate).toISOString();
            }

            if (Object.keys(updates).length > 0) {
                await fetch(`/api/admin/leads/${lead.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });
            }

            showToast("success", `Interaction logged for ${lead.name}`);
            onSuccess();
            onClose();
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to record log");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface border border-hairline rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised">
                    <div>
                        <h2 className="text-base font-bold text-ink">Quick Log Touch</h2>
                        <p className="text-xs text-ink-subtle">
                            {lead.name} &bull; {lead.phone || lead.email}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-ink-subtle hover:text-ink hover:bg-surface transition-colors">
                        <LuX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Activity Type Selection */}
                    <div>
                        <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-2 block">Interaction Type</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {ACTIVITY_TYPES.map((t) => {
                                const Icon = t.icon;
                                const isSelected = selectedType === t.type;
                                return (
                                    <button
                                        type="button"
                                        key={t.type}
                                        onClick={() => handleSelectType(t.type)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                            isSelected
                                                ? `${t.color} font-bold ring-2 ring-brand/40 shadow-sm`
                                                : "bg-surface border-hairline text-ink-subtle hover:bg-surface-raised hover:text-ink"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 mb-1" />
                                        <span className="text-[11px] leading-tight">{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Outcomes for Phone Call */}
                    {selectedType === "CALL" && (
                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 block">Call Outcome</label>
                            <div className="flex flex-wrap gap-1.5">
                                {CALL_OUTCOMES.map((item) => (
                                    <button
                                        type="button"
                                        key={item}
                                        onClick={() => handleOutcomeClick(item)}
                                        className={`px-2.5 py-1 text-xs rounded-control border transition-colors ${
                                            outcome === item
                                                ? "bg-brand text-white border-brand font-medium shadow-xs"
                                                : "bg-surface-raised border-hairline text-ink hover:border-brand/40"
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content / Notes */}
                    <div>
                        <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Activity Details / Notes</label>
                        <textarea
                            rows={3}
                            required
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                            placeholder="Details of the conversation or next step..."
                        />
                    </div>

                    {/* Update Pipeline Stage & Follow-up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-hairline">
                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Move Stage</label>
                            <select
                                value={nextStatus}
                                onChange={(e) => setNextStatus(e.target.value)}
                                className="w-full text-xs rounded-control border border-hairline bg-surface px-2.5 py-1.5 text-ink focus:outline-none focus:border-brand"
                            >
                                <option value="NEW">New</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="TRIAL">Trial</option>
                                <option value="CONVERTED">Converted</option>
                                <option value="LOST">Lost</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Next Follow-up</label>
                            <input
                                type="date"
                                value={nextFollowUpDate}
                                onChange={(e) => setNextFollowUpDate(e.target.value)}
                                className="w-full text-xs rounded-control border border-hairline bg-surface px-2.5 py-1.5 text-ink focus:outline-none focus:border-brand"
                            />
                            <div className="flex gap-1 mt-1 text-[10px]">
                                <button type="button" onClick={() => handleQuickFollowUp(1)} className="px-1.5 py-0.5 rounded bg-surface-raised hover:bg-surface border border-hairline text-ink-subtle hover:text-ink">
                                    +1 Day
                                </button>
                                <button type="button" onClick={() => handleQuickFollowUp(3)} className="px-1.5 py-0.5 rounded bg-surface-raised hover:bg-surface border border-hairline text-ink-subtle hover:text-ink">
                                    +3 Days
                                </button>
                                <button type="button" onClick={handleNextMonday} className="px-1.5 py-0.5 rounded bg-surface-raised hover:bg-surface border border-hairline text-ink-subtle hover:text-ink">
                                    Next Mon
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-ink-subtle hover:text-ink transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 rounded-control bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-all shadow-sm disabled:opacity-50"
                        >
                            {submitting ? "Saving..." : "Save Activity"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function QuickLogModal({ lead, isOpen, onClose, onSuccess }: Props) {
    if (!isOpen || !lead) return null;
    return <QuickLogForm key={lead.id} lead={lead} onClose={onClose} onSuccess={onSuccess} />;
}
