"use client";

import { useEffect, useState } from "react";
import { LuClock, LuUsers, LuCheck, LuX, LuCalendar, LuSparkles } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";

export type BatchOption = {
    id: string;
    name: string;
    planType: string;
    daysOfWeek: string[];
    timeSlot: string;
    durationMin: number;
    capacity: number;
    teacher: string;
    recentHeadcount: number;
};

interface Props {
    memberId: string;
    studentName: string;
    currentBatchId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BatchSwitchModal({
    memberId,
    studentName,
    currentBatchId,
    isOpen,
    onClose,
    onSuccess,
}: Props) {
    const { showToast } = useToast();
    const [batches, setBatches] = useState<BatchOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatchId, setSelectedBatchId] = useState<string>(currentBatchId || "");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch(`/api/admin/members/${memberId}/batch`)
            .then((r) => r.json())
            .then((d) => {
                if (d.batches) setBatches(d.batches);
            })
            .catch(() => showToast("error", "Failed to load class batches"))
            .finally(() => setLoading(false));
    }, [isOpen, memberId, showToast]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBatchId) {
            showToast("error", "Please choose a batch");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/members/${memberId}/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId: selectedBatchId, reason }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to switch batch");
            }

            showToast("success", "Student batch updated successfully");
            onSuccess();
            onClose();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Error switching batch");
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
                className="bg-surface rounded-2xl shadow-xl border border-hairline w-full max-w-lg overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-surface-raised">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                            <LuClock className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm text-ink">Switch Primary Class Batch</h2>
                            <p className="text-xs text-ink-subtle">{studentName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-ink-subtle hover:bg-surface hover:text-ink transition-colors"
                    >
                        <LuX className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                            Select Available Group Batch
                        </label>

                        {loading ? (
                            <div className="py-8 text-center text-xs text-ink-subtle">
                                Loading active batches...
                            </div>
                        ) : batches.length === 0 ? (
                            <div className="py-6 text-center text-xs text-ink-subtle">
                                No active recurring batches found.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {batches.map((b) => {
                                    const isSelected = selectedBatchId === b.id;
                                    const isFull = b.capacity > 0 && b.recentHeadcount >= b.capacity;

                                    return (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedBatchId(b.id)}
                                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                                isSelected
                                                    ? "border-brand bg-brand/5 ring-1 ring-brand/30 shadow-xs"
                                                    : "border-hairline hover:bg-surface-raised bg-surface"
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-ink">
                                                        {b.name}
                                                    </span>
                                                    <span className="px-2 py-0.2 rounded-md bg-surface-raised border border-hairline font-semibold text-brand text-[11px]">
                                                        {b.timeSlot}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-subtle text-[11px]">
                                                    <span className="flex items-center gap-1">
                                                        <LuCalendar className="w-3 h-3" />
                                                        {b.daysOfWeek.join(", ")}
                                                    </span>
                                                    <span>Teacher: <b>{b.teacher}</b></span>
                                                </div>
                                            </div>

                                            {/* Capacity & Radio indicator */}
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <div className="flex items-center gap-1 text-[11px] font-medium">
                                                    <LuUsers className="w-3 h-3 text-ink-subtle" />
                                                    <span className={isFull ? "text-red-600 font-bold" : "text-ink-subtle"}>
                                                        {b.recentHeadcount}/{b.capacity} yogis
                                                    </span>
                                                </div>

                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                        isSelected
                                                            ? "border-brand bg-brand text-white"
                                                            : "border-hairline bg-surface"
                                                    }`}
                                                >
                                                    {isSelected && <LuCheck className="w-2.5 h-2.5" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                            Reason for Batch Change (Optional)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Morning office commute schedule conflict"
                            className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                        />
                    </div>

                    {/* Modal Footer */}
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
                            disabled={submitting || !selectedBatchId}
                            className="px-4 py-1.5 rounded-full bg-brand hover:bg-brand/90 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {submitting ? "Assigning..." : "Confirm Batch Switch"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
