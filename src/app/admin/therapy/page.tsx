"use client";

import { useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, labelClass, inputClass } from "@/components/admin/ui";

type Status = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "RECOMMENDED" | "RECOMMENDED_WITH_CONDITIONS" | "NOT_RECOMMENDED";

type IntakeRow = {
    id: string;
    status: Status;
    primaryConcern: string | null;
    submittedAt: string | null;
    createdAt: string;
    user: { id: string; name: string; email: string; phone: string | null; country: string | null };
};

type IntakeDetail = IntakeRow & {
    fullName: string | null;
    age: number | null;
    gender: string | null;
    heightCm: number | null;
    weightKg: number | null;
    concernDuration: string | null;
    concernDescription: string | null;
    injuriesSurgeries: string | null;
    medicalConditions: string | null;
    medications: string | null;
    familyHistory: string | null;
    priorYogaTherapy: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    reviewNotes: string | null;
    reviewedBy: { id: string; name: string } | null;
}

const STATUS_TONE: Record<Status, "gray" | "amber" | "blue" | "green" | "red"> = {
    DRAFT: "gray",
    SUBMITTED: "blue",
    UNDER_REVIEW: "amber",
    RECOMMENDED: "green",
    RECOMMENDED_WITH_CONDITIONS: "amber",
    NOT_RECOMMENDED: "red",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="border-b border-gray-100 pb-2.5 mb-2.5">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{value ?? "—"}</div>
        </div>
    );
}

export default function AdminTherapyIntakesPage() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<IntakeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<IntakeDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [deciding, setDeciding] = useState(false);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/therapy/intakes");
            const data = await res.json();
            setRows(data.intakes || []);
        } catch {
            showToast("error", "Failed to load assessments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openDetail = async (row: IntakeRow) => {
        setDetailLoading(true);
        setNotes("");
        try {
            const res = await fetch(`/api/admin/therapy/intakes/${row.id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not load");
            setDetail(data.intake);
            setNotes(data.intake.reviewNotes || "");
            fetchRows(); // status may have flipped to UNDER_REVIEW
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Could not load assessment");
        } finally {
            setDetailLoading(false);
        }
    };

    const decide = async (decision: "RECOMMENDED" | "RECOMMENDED_WITH_CONDITIONS" | "NOT_RECOMMENDED") => {
        if (!detail) return;
        setDeciding(true);
        try {
            const res = await fetch(`/api/admin/therapy/intakes/${detail.id}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, notes }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not save decision");
            showToast("success", "Decision recorded");
            setDetail(null);
            fetchRows();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    const columns = [
        {
            header: "Applicant",
            accessor: (r: IntakeRow) => (
                <div>
                    <div className="font-bold text-gray-800">{r.user.name}</div>
                    <div className="text-xs text-gray-500">{r.user.email}</div>
                </div>
            ),
        },
        {
            header: "Concern",
            accessor: (r: IntakeRow) => <span className="text-sm text-gray-600">{r.primaryConcern || "—"}</span>,
        },
        {
            header: "Status",
            accessor: (r: IntakeRow) => <Badge tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g, " ")}</Badge>,
        },
        {
            header: "Submitted",
            accessor: (r: IntakeRow) => (
                <span className="text-sm text-gray-500">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "Not yet"}
                </span>
            ),
        },
    ];

    if (loading) return <PageLoading title="Yoga Therapy Assessments" />;

    return (
        <div>
            <PageHeader title="Yoga Therapy Assessments" subtitle="Review intake forms and record a recommendation." />

            <DTable
                data={rows}
                columns={columns}
                title="Assessments"
                searchable
                filters={[
                    {
                        key: "status",
                        label: "Status",
                        options: [
                            { label: "Submitted", value: "SUBMITTED" },
                            { label: "Under review", value: "UNDER_REVIEW" },
                            { label: "Recommended", value: "RECOMMENDED" },
                            { label: "Recommended (conditions)", value: "RECOMMENDED_WITH_CONDITIONS" },
                            { label: "Not recommended", value: "NOT_RECOMMENDED" },
                        ],
                    },
                ]}
                actions={(r) => (
                    <TableActions>
                        <ActionButton onClick={() => openDetail(r)}>Review</ActionButton>
                    </TableActions>
                )}
            />

            {(detail || detailLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setDetail(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-serif text-xl text-gray-800">{detail?.user.name ?? "Loading…"}</h2>
                            <button onClick={() => setDetail(null)} className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">&times;</button>
                        </div>

                        {detailLoading || !detail ? (
                            <div className="p-10 text-center text-gray-400">Loading…</div>
                        ) : (
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-x-6">
                                    <Field label="Email" value={detail.user.email} />
                                    <Field label="Phone" value={detail.user.phone} />
                                    <Field label="Age / Gender" value={`${detail.age ?? "—"} / ${detail.gender ?? "—"}`} />
                                    <Field label="Height / Weight" value={`${detail.heightCm ?? "—"} cm / ${detail.weightKg ?? "—"} kg`} />
                                </div>
                                <Field label="Primary concern" value={detail.primaryConcern} />
                                <Field label="Duration" value={detail.concernDuration} />
                                <Field label="Description" value={detail.concernDescription} />
                                <Field label="Injuries / surgeries" value={detail.injuriesSurgeries} />
                                <Field label="Medical conditions" value={detail.medicalConditions} />
                                <Field label="Medications" value={detail.medications} />
                                <Field label="Family history" value={detail.familyHistory} />
                                <Field label="Prior Yoga Therapy" value={detail.priorYogaTherapy} />
                                <Field label="Emergency contact" value={`${detail.emergencyContactName ?? "—"} · ${detail.emergencyContactPhone ?? "—"}`} />

                                {detail.reviewedBy && (
                                    <p className="text-xs text-gray-400 mb-3">
                                        Last reviewed by {detail.reviewedBy.name}
                                    </p>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className={labelClass}>Notes (shared with the applicant if recommended)</label>
                                    <textarea
                                        rows={3}
                                        className={inputClass}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Avoid deep backbends for the first 4 weeks."
                                    />
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <button
                                            onClick={() => decide("RECOMMENDED")}
                                            disabled={deciding}
                                            className="px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            Recommend
                                        </button>
                                        <button
                                            onClick={() => decide("RECOMMENDED_WITH_CONDITIONS")}
                                            disabled={deciding}
                                            className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
                                        >
                                            Recommend with conditions
                                        </button>
                                        <button
                                            onClick={() => decide("NOT_RECOMMENDED")}
                                            disabled={deciding}
                                            className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            Not recommended
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        &ldquo;Not recommended&rdquo; is never shown to the applicant as a status — reach out
                                        to them directly to explain next steps.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
