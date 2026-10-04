"use client";

import { useState } from "react";
import {
    LuPause,
    LuPlay,
    LuCalendarPlus,
    LuArrowRightLeft,
    LuX,
    LuCheck,
    LuClock
} from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";

interface Props {
    memberId: string;
    studentName: string;
    currentSubscription: {
        status: string;
        planType: string;
        planKey: string | null;
        renewalDate: string;
        pausedAt: string | null;
    } | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type TabType = "pause" | "extend" | "switch";

export function MembershipActionModal({
    memberId,
    studentName,
    currentSubscription,
    isOpen,
    onClose,
    onSuccess,
}: Props) {
    const { showToast } = useToast();
    const isPaused = Boolean(currentSubscription?.pausedAt);
    const [activeTab, setActiveTab] = useState<TabType>("pause");

    // Pause state
    const [pauseDays, setPauseDays] = useState(14);
    const [pauseReason, setPauseReason] = useState("Travel / Medical temporary freeze");

    // Extend state
    const [extendDays, setExtendDays] = useState(15);
    const [extendReason, setExtendReason] = useState("Administrative validity grant");

    // Switch track state
    const [targetPlanType, setTargetPlanType] = useState(
        currentSubscription?.planType === "YOGA_THERAPY" ? "EVERYDAY_YOGA" : "YOGA_THERAPY"
    );
    const [switchReason, setSwitchReason] = useState("Track upgrade / consultation reassignment");

    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAction = async (payload: Record<string, unknown>) => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/members/${memberId}/subscription-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Action failed");
            }

            showToast("success", "Membership updated successfully");
            onSuccess();
            onClose();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Failed to update membership");
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
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-surface-raised">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                            <LuClock className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm text-ink">Manage Membership Lifecycle</h2>
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

                {/* Tabs */}
                <div className="flex border-b border-hairline bg-surface px-5 pt-2 gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("pause")}
                        className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeTab === "pause"
                                ? "border-brand text-brand font-semibold"
                                : "border-transparent text-ink-subtle hover:text-ink"
                        }`}
                    >
                        {isPaused ? <LuPlay className="w-3.5 h-3.5 text-emerald-600" /> : <LuPause className="w-3.5 h-3.5" />}
                        <span>{isPaused ? "Resume" : "Freeze / Pause"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("extend")}
                        className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeTab === "extend"
                                ? "border-brand text-brand font-semibold"
                                : "border-transparent text-ink-subtle hover:text-ink"
                        }`}
                    >
                        <LuCalendarPlus className="w-3.5 h-3.5" />
                        <span>Extend Validity</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("switch")}
                        className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeTab === "switch"
                                ? "border-brand text-brand font-semibold"
                                : "border-transparent text-ink-subtle hover:text-ink"
                        }`}
                    >
                        <LuArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Switch Track</span>
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="p-5 space-y-4 text-xs">
                    {/* Pause / Resume Tab */}
                    {activeTab === "pause" && (
                        <div className="space-y-3.5">
                            {isPaused ? (
                                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                        <LuPlay className="w-4 h-4" />
                                        <span>Membership is currently Paused</span>
                                    </div>
                                    <p className="text-emerald-700 leading-normal">
                                        Resuming will reactivate attendance access immediately and extend the renewal
                                        date by the elapsed freeze duration so no paid days are lost.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleAction({ action: "RESUME" })}
                                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50 mt-1 shadow-xs"
                                    >
                                        {submitting ? "Resuming..." : "Resume & Reactivate Membership"}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                                            Freeze Duration (Days)
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[7, 14, 30].map((d) => (
                                                <button
                                                    type="button"
                                                    key={d}
                                                    onClick={() => setPauseDays(d)}
                                                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                                                        pauseDays === d
                                                            ? "border-brand bg-brand/10 text-brand"
                                                            : "border-hairline hover:bg-surface-raised text-ink"
                                                    }`}
                                                >
                                                    {d} Days
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                                            Reason for Freeze
                                        </label>
                                        <input
                                            type="text"
                                            value={pauseReason}
                                            onChange={(e) => setPauseReason(e.target.value)}
                                            placeholder="e.g. Traveling abroad / medical recuperation"
                                            className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() =>
                                            handleAction({
                                                action: "PAUSE",
                                                days: pauseDays,
                                                reason: pauseReason,
                                            })
                                        }
                                        className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                                    >
                                        <LuPause className="w-3.5 h-3.5" />
                                        <span>{submitting ? "Freezing..." : `Freeze Membership for ${pauseDays} Days`}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Extend Validity Tab */}
                    {activeTab === "extend" && (
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                                    Add Days to Current Cycle
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[7, 15, 30].map((d) => (
                                        <button
                                            type="button"
                                            key={d}
                                            onClick={() => setExtendDays(d)}
                                            className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                                                extendDays === d
                                                    ? "border-brand bg-brand/10 text-brand"
                                                    : "border-hairline hover:bg-surface-raised text-ink"
                                            }`}
                                        >
                                            +{d} Days
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                                    Reason for Granting Extension
                                </label>
                                <input
                                    type="text"
                                    value={extendReason}
                                    onChange={(e) => setExtendReason(e.target.value)}
                                    placeholder="e.g. Festival holiday goodwill / studio technical maintenance compensation"
                                    className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                                />
                            </div>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                    handleAction({
                                        action: "EXTEND",
                                        days: extendDays,
                                        reason: extendReason,
                                    })
                                }
                                className="w-full py-2 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                            >
                                <LuCalendarPlus className="w-3.5 h-3.5" />
                                <span>{submitting ? "Extending..." : `Grant +${extendDays} Days Extension`}</span>
                            </button>
                        </div>
                    )}

                    {/* Switch Track Tab */}
                    {activeTab === "switch" && (
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                                    Target Practice Track
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetPlanType("EVERYDAY_YOGA")}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            targetPlanType === "EVERYDAY_YOGA"
                                                ? "border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand/30"
                                                : "border-hairline hover:bg-surface-raised text-ink"
                                        }`}
                                    >
                                        <span className="block font-bold text-xs">Everyday Yoga</span>
                                        <span className="text-[10px] text-ink-subtle">
                                            Daily morning/evening group classes
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTargetPlanType("YOGA_THERAPY")}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            targetPlanType === "YOGA_THERAPY"
                                                ? "border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand/30"
                                                : "border-hairline hover:bg-surface-raised text-ink"
                                        }`}
                                    >
                                        <span className="block font-bold text-xs">Yoga Therapy</span>
                                        <span className="text-[10px] text-ink-subtle">
                                            1:1 personalized clinical healing
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                                    Reason for Track Switch
                                </label>
                                <input
                                    type="text"
                                    value={switchReason}
                                    onChange={(e) => setSwitchReason(e.target.value)}
                                    placeholder="e.g. Student upgraded after clinical consultation"
                                    className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                                />
                            </div>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                    handleAction({
                                        action: "SWITCH_TRACK",
                                        targetPlanType,
                                        reason: switchReason,
                                    })
                                }
                                className="w-full py-2 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                            >
                                <LuArrowRightLeft className="w-3.5 h-3.5" />
                                <span>{submitting ? "Switching..." : "Confirm Track Switch"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
