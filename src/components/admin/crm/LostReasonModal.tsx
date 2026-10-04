"use client";

import { useState } from "react";
import { LuTriangleAlert, LuX, LuCheck } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";

export type LostLead = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
};

type Props = {
    /** Single-lead mode (Kanban drag, edit form). */
    lead?: LostLead | null;
    /** Bulk mode (table bulk-action bar) — applies the same reason to every lead. */
    leads?: LostLead[] | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

const LOST_REASONS = [
    { id: "pricing", label: "Pricing / Fee too high" },
    { id: "schedule", label: "Timing / Schedule mismatch" },
    { id: "distance", label: "Location / Distance / Commute" },
    { id: "competitor", label: "Joined competitor / Another studio" },
    { id: "medical", label: "Medical reason / Doctor advice" },
    { id: "unresponsive", label: "Unresponsive / Ghosted after touch" },
    { id: "accidental", label: "Accidental inquiry / Not interested" },
    { id: "other", label: "Other reason" },
];

export function LostReasonModal({ lead, leads, isOpen, onClose, onSuccess }: Props) {
    const { showToast } = useToast();
    const [selectedReason, setSelectedReason] = useState(LOST_REASONS[0].label);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const targets = lead ? [lead] : leads ?? [];
    if (!isOpen || targets.length === 0) return null;
    const isBulk = targets.length > 1;

    const markOneLost = async (target: LostLead, summary: string) => {
        const updateRes = await fetch(`/api/admin/leads/${target.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "LOST" }),
        });
        if (!updateRes.ok) throw new Error(`Failed to update ${target.name}`);

        await fetch(`/api/admin/leads/${target.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "NOTE", content: `[Pipeline Lost] ${summary}` }),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const summary = `Lost Reason: ${selectedReason}${notes.trim() ? ` — ${notes.trim()}` : ""}`;

            for (const target of targets) {
                await markOneLost(target, summary);
            }

            showToast("info", isBulk ? `Marked ${targets.length} leads as Lost` : `Marked ${targets[0].name} as Lost`);
            onSuccess();
            onClose();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Failed to record lost reason");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl shadow-xl border border-hairline w-full max-w-md overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-surface-raised">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                            <LuTriangleAlert className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm text-ink">
                                {isBulk ? `Mark ${targets.length} Leads as Lost` : "Mark Lead as Lost"}
                            </h2>
                            <p className="text-xs text-ink-subtle">
                                {isBulk ? `${targets.length} leads selected` : targets[0].name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-ink-subtle hover:bg-surface hover:text-ink transition-colors"
                    >
                        <LuX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                            Select Reason for Exit
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {LOST_REASONS.map((r) => {
                                const isSelected = selectedReason === r.label;
                                return (
                                    <button
                                        type="button"
                                        key={r.id}
                                        onClick={() => setSelectedReason(r.label)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                                            isSelected
                                                ? "border-red-400 bg-red-50/50 text-red-900 font-semibold"
                                                : "border-hairline hover:bg-surface-raised text-ink"
                                        }`}
                                    >
                                        <span>{r.label}</span>
                                        {isSelected && <LuCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                            Additional Context (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add details, feedback or notes for future re-engagement campaigns..."
                            className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-ink-subtle hover:bg-surface-raised transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {submitting ? "Saving..." : isBulk ? `Confirm & Move ${targets.length} to Lost` : "Confirm & Move to Lost"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
