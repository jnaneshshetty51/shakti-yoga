"use client";

import { useState } from "react";
import {
    LuTriangleAlert,
    LuHeartPulse,
    LuPhone,
    LuChevronDown,
    LuChevronUp,
    LuCircleCheck,
    LuFileText,
    LuUser,
    LuStethoscope,
    LuX
} from "react-icons/lu";

export type TherapyIntakeData = {
    id?: string;
    status: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    reviewNotes?: string | null;
    fullName?: string | null;
    age?: number | null;
    gender?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    primaryConcern?: string | null;
    concernDuration?: string | null;
    concernDescription?: string | null;
    injuriesSurgeries?: string | null;
    medicalConditions?: string | null;
    medications?: string | null;
    familyHistory?: string | null;
    priorYogaTherapy?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
} | null;

interface Props {
    intake: TherapyIntakeData;
    studentName: string;
}

export function MedicalSafetyBanner({ intake, studentName }: Props) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (!intake) return null;

    // Parse medical condition tags
    const conditionList: string[] = [];
    if (intake.medicalConditions) {
        intake.medicalConditions
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((c) => conditionList.push(c));
    }
    if (intake.injuriesSurgeries) {
        intake.injuriesSurgeries
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((c) => conditionList.push(c));
    }
    if (conditionList.length === 0 && intake.primaryConcern) {
        conditionList.push(intake.primaryConcern);
    }

    const hasCriticalWarning = conditionList.length > 0 || !!intake.reviewNotes;

    // Calculate BMI if height and weight exist
    const bmi =
        intake.heightCm && intake.weightKg
            ? (intake.weightKg / Math.pow(intake.heightCm / 100, 2)).toFixed(1)
            : null;

    return (
        <>
            {/* Safety Alert Banner — the alarming red styling is reserved for intakes that actually
                flagged something; a clean intake still needs quick access to its record, just not
                the "caution" framing (showing it for every intake trains staff to ignore it). */}
            <div
                className={
                    hasCriticalWarning
                        ? "mb-4 rounded-2xl border border-red-200/80 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-surface p-4 shadow-xs"
                        : "mb-4 rounded-2xl border border-hairline bg-surface p-4 shadow-xs"
                }
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div
                            className={
                                hasCriticalWarning
                                    ? "w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5"
                                    : "w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5"
                            }
                        >
                            <LuHeartPulse className={hasCriticalWarning ? "w-5 h-5 animate-pulse" : "w-5 h-5"} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={
                                        hasCriticalWarning
                                            ? "text-[11px] font-bold tracking-wider uppercase text-red-700"
                                            : "text-[11px] font-bold tracking-wider uppercase text-ink-subtle"
                                    }
                                >
                                    {hasCriticalWarning ? "Clinical Safety & Intake Caution" : "Clinical Intake on File"}
                                </span>
                                <span
                                    className={
                                        hasCriticalWarning
                                            ? "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800"
                                            : "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised text-ink-subtle"
                                    }
                                >
                                    {intake.status.replace(/_/g, " ")}
                                </span>
                            </div>

                            {/* Medical Alert Pills — only meaningful when there's actually something flagged */}
                            {hasCriticalWarning && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {conditionList.slice(0, 4).map((cond, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200"
                                        >
                                            <LuTriangleAlert className="w-3 h-3 text-red-500 shrink-0" />
                                            <span>{cond}</span>
                                        </span>
                                    ))}
                                    {conditionList.length > 4 && (
                                        <span className="text-xs text-red-600 font-medium">
                                            +{conditionList.length - 4} more
                                        </span>
                                    )}
                                    {intake.reviewNotes && (
                                        <span className="text-xs text-ink-subtle italic line-clamp-1 max-w-sm ml-1">
                                            &ldquo;{intake.reviewNotes}&rdquo;
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Emergency & Drawer CTA */}
                    <div className="flex items-center gap-2 shrink-0">
                        {intake.emergencyContactPhone && (
                            <a
                                href={`tel:${intake.emergencyContactPhone}`}
                                title={`Emergency: ${intake.emergencyContactName || "Contact"}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-surface hover:bg-red-50 text-xs font-semibold text-red-700 transition-colors"
                            >
                                <LuPhone className="w-3.5 h-3.5" />
                                <span>{intake.emergencyContactName || "Emergency"}</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-ink text-surface hover:bg-ink/90 text-xs font-semibold shadow-xs transition-colors"
                        >
                            <LuFileText className="w-3.5 h-3.5" />
                            <span>Clinical Intake</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Comprehensive Clinical Intake Drawer / Modal */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
                    onClick={() => setIsDrawerOpen(false)}
                >
                    <div
                        className="bg-surface rounded-2xl shadow-2xl border border-hairline w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline sticky top-0 bg-surface/95 backdrop-blur-xs z-10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                                    <LuStethoscope className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm text-ink">
                                        Clinical Health Assessment & Intake
                                    </h2>
                                    <p className="text-xs text-ink-subtle">{studentName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="p-1.5 rounded-full text-ink-subtle hover:bg-surface-raised hover:text-ink transition-colors"
                            >
                                <LuX className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-5 text-xs">
                            {/* Vitals & Demographics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-raised border border-hairline">
                                <div>
                                    <span className="text-ink-subtle block">Age / Gender</span>
                                    <span className="font-semibold text-ink">
                                        {intake.age ? `${intake.age} yrs` : "—"} · {intake.gender || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-ink-subtle block">Height</span>
                                    <span className="font-semibold text-ink">
                                        {intake.heightCm ? `${intake.heightCm} cm` : "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-ink-subtle block">Weight</span>
                                    <span className="font-semibold text-ink">
                                        {intake.weightKg ? `${intake.weightKg} kg` : "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-ink-subtle block">BMI</span>
                                    <span className="font-semibold text-ink">
                                        {bmi ? `${bmi} kg/m²` : "—"}
                                    </span>
                                </div>
                            </div>

                            {/* Primary Concern & Description */}
                            <div className="p-4 rounded-xl border border-hairline bg-surface space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-ink text-sm">
                                        {intake.primaryConcern || "Primary Health Concern"}
                                    </span>
                                    {intake.concernDuration && (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-brand/10 text-brand font-medium">
                                            Duration: {intake.concernDuration}
                                        </span>
                                    )}
                                </div>
                                {intake.concernDescription && (
                                    <p className="text-ink leading-relaxed whitespace-pre-wrap">
                                        {intake.concernDescription}
                                    </p>
                                )}
                            </div>

                            {/* Medical History Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-xl border border-hairline space-y-1">
                                    <span className="font-semibold text-ink block">
                                        Injuries & Surgical History
                                    </span>
                                    <p className="text-ink-subtle leading-normal">
                                        {intake.injuriesSurgeries || "None reported"}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-hairline space-y-1">
                                    <span className="font-semibold text-ink block">
                                        Medical Conditions & Chronic Illness
                                    </span>
                                    <p className="text-ink-subtle leading-normal">
                                        {intake.medicalConditions || "None reported"}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-hairline space-y-1">
                                    <span className="font-semibold text-ink block">
                                        Prescription Medications
                                    </span>
                                    <p className="text-ink-subtle leading-normal">
                                        {intake.medications || "None"}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-hairline space-y-1">
                                    <span className="font-semibold text-ink block">
                                        Prior Yoga Therapy Experience
                                    </span>
                                    <p className="text-ink-subtle leading-normal">
                                        {intake.priorYogaTherapy || "No prior therapy practice"}
                                    </p>
                                </div>
                            </div>

                            {/* Therapist Review Notes */}
                            {intake.reviewNotes && (
                                <div className="p-4 rounded-xl border border-brand/20 bg-brand/5 space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-brand">
                                        <LuCircleCheck className="w-3.5 h-3.5" />
                                        <span>Therapist Assessment & Sequence Instructions</span>
                                    </div>
                                    <p className="text-ink leading-relaxed whitespace-pre-wrap">
                                        {intake.reviewNotes}
                                    </p>
                                    {intake.reviewedBy && (
                                        <div className="text-[11px] text-ink-subtle pt-1">
                                            Reviewed by: <b>{intake.reviewedBy}</b>
                                            {intake.reviewedAt && ` on ${new Date(intake.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Emergency Contact */}
                            {(intake.emergencyContactName || intake.emergencyContactPhone) && (
                                <div className="p-3 rounded-xl border border-red-200 bg-red-50/50 flex items-center justify-between text-xs">
                                    <div>
                                        <span className="text-red-700 font-semibold block">Emergency Contact</span>
                                        <span className="text-ink">
                                            {intake.emergencyContactName || "Not named"}
                                        </span>
                                    </div>
                                    {intake.emergencyContactPhone && (
                                        <a
                                            href={`tel:${intake.emergencyContactPhone}`}
                                            className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold flex items-center gap-1 hover:bg-red-700 transition-colors"
                                        >
                                            <LuPhone className="w-3 h-3" />
                                            <span>{intake.emergencyContactPhone}</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-hairline bg-surface-raised flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                className="px-4 py-1.5 rounded-full bg-surface border border-hairline hover:bg-surface-raised text-xs font-semibold text-ink transition-colors"
                            >
                                Close Intake Sheet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
