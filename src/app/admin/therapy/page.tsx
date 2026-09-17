"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, Tabs, Badge, TableActions, ActionButton, Button, labelClass, inputClass } from "@/components/admin/ui";
import { AdminBookingsContent } from "@/app/admin/bookings/page";
import { PLAN_OPTIONS, CURRENCY_OPTIONS } from "@/lib/pricing";

const THERAPY_PLAN_OPTIONS = PLAN_OPTIONS.filter((o) => o.value === "therapy" || o.value === "therapy_annual");

const WALKIN_FIELDS: FieldDef[] = [
    { name: "name", label: "Full name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "text" },
    { name: "planKey", label: "Plan", type: "select", required: true, options: THERAPY_PLAN_OPTIONS },
    { name: "currency", label: "Currency", type: "select", required: true, options: CURRENCY_OPTIONS },
    { name: "amount", label: "Amount collected", type: "number", required: true, placeholder: "e.g. 5000 (INR) or 69 (USD)" },
    { name: "method", label: "Payment method", type: "select", required: true, options: [
        { label: "Cash", value: "cash" }, { label: "UPI", value: "upi" }, { label: "Bank transfer", value: "bank_transfer" },
    ] },
    { name: "note", label: "Note (e.g. UPI ref / receipt no.)", type: "text" },
];

const INTAKE_FIELDS: FieldDef[] = [
    { name: "email", label: "Select Student / Member", type: "student", required: true },
    { name: "fullName", label: "Full name", type: "text" },
    { name: "age", label: "Age", type: "number" },
    { name: "gender", label: "Gender", type: "text" },
    { name: "heightCm", label: "Height (cm)", type: "number" },
    { name: "weightKg", label: "Weight (kg)", type: "number" },
    { name: "primaryConcern", label: "Primary concern", type: "text" },
    { name: "concernDuration", label: "How long has this been going on?", type: "text" },
    { name: "concernDescription", label: "Describe the concern", type: "textarea" },
    { name: "injuriesSurgeries", label: "Injuries / surgeries", type: "textarea" },
    { name: "medicalConditions", label: "Medical conditions", type: "textarea" },
    { name: "medications", label: "Medications", type: "textarea" },
    { name: "familyHistory", label: "Family history", type: "textarea" },
    { name: "priorYogaTherapy", label: "Prior yoga therapy experience", type: "textarea" },
    { name: "emergencyContactName", label: "Emergency contact name", type: "text" },
    { name: "emergencyContactPhone", label: "Emergency contact phone", type: "text" },
    { name: "consentGiven", label: "Client has given consent for this assessment", type: "checkbox" },
    { name: "submit", label: "Submit for review now (uncheck to save as a draft to finish later)", type: "checkbox" },
];

type Status = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "RECOMMENDED" | "RECOMMENDED_WITH_CONDITIONS" | "NOT_RECOMMENDED";

type IntakeRow = {
    id: string;
    status: Status;
    primaryConcern: string | null;
    submittedAt: string | null;
    createdAt: string;
    user: { id: string; name: string; email: string; phone: string | null; country: string | null };
};

/** A private, staff-only module attached to a patient — see prisma's TherapyModule doc comment. Never shown to the patient. */
type ModuleRow = {
    id: string;
    title: string;
    body: string | null;
    enabled: boolean;
    attachmentUrl: string | null;
    attachmentName: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
};

const MODULE_TITLE_PRESETS = [
    "Diagnosis & Assessment",
    "Treatment Plan",
    "Precautions / Contraindications",
    "Internal Notes",
    "Progress Review",
];

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

const PAGE_SIZE = 25;

function AdminTherapyIntakesContent({ embedded = false }: { embedded?: boolean }) {
    const { showToast } = useToast();
    const [rows, setRows] = useState<IntakeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<IntakeDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [deciding, setDeciding] = useState(false);
    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [modulesLoading, setModulesLoading] = useState(false);
    const [moduleForm, setModuleForm] = useState<{
        id: string | null; title: string; body: string; enabled: boolean; attachmentUrl: string; attachmentName: string;
    } | null>(null);
    const [moduleSaving, setModuleSaving] = useState(false);
    const [moduleUploading, setModuleUploading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [registerOpen, setRegisterOpen] = useState(false);
    const [credentials, setCredentials] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
    const [intakeFor, setIntakeFor] = useState<{ email: string; fullName?: string } | null>(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set('q', search);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/admin/therapy/intakes?${params}`);
            const data = await res.json();
            setRows(data.intakes || []);
            setTotalCount(data.totalCount ?? 0);
        } catch {
            showToast("error", "Failed to load assessments");
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, showToast]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const registerWalkin = async (values: EntityValues) => {
        const res = await fetch("/api/admin/therapy/walkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not register the client");
        setRegisterOpen(false);
        setCredentials({ name: String(values.name), email: String(values.email), tempPassword: json.tempPassword });
        showToast("success", "Client registered.");
    };

    const saveIntake = async (values: EntityValues) => {
        const res = await fetch("/api/admin/therapy/intakes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not save the assessment");
        setIntakeFor(null);
        showToast("success", values.submit ? "Assessment submitted." : "Draft saved.");
        fetchRows();
    };

    const openDetail = async (row: IntakeRow) => {
        setDetailLoading(true);
        setNotes("");
        setModules([]);
        try {
            const res = await fetch(`/api/admin/therapy/intakes/${row.id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not load");
            setDetail(data.intake);
            setNotes(data.intake.reviewNotes || "");
            fetchRows(); // status may have flipped to UNDER_REVIEW
            fetchModules(data.intake.user.id);
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Could not load assessment");
        } finally {
            setDetailLoading(false);
        }
    };

    const fetchModules = async (patientId: string) => {
        setModulesLoading(true);
        try {
            const res = await fetch(`/api/admin/members/${patientId}/therapy-modules`);
            const data = await res.json();
            if (res.ok) setModules(data.modules || []);
        } finally {
            setModulesLoading(false);
        }
    };

    const saveModule = async () => {
        if (!detail || !moduleForm || !moduleForm.title.trim()) return;
        setModuleSaving(true);
        try {
            const payload = {
                title: moduleForm.title.trim(),
                body: moduleForm.body.trim(),
                enabled: moduleForm.enabled,
                attachmentUrl: moduleForm.attachmentUrl,
                attachmentName: moduleForm.attachmentName,
            };
            const res = moduleForm.id
                ? await fetch(`/api/admin/members/${detail.user.id}/therapy-modules`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ moduleId: moduleForm.id, ...payload }),
                  })
                : await fetch(`/api/admin/members/${detail.user.id}/therapy-modules`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                  });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not save the module");
            showToast("success", moduleForm.id ? "Module updated." : "Module added.");
            setModuleForm(null);
            fetchModules(detail.user.id);
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Could not save the module");
        } finally {
            setModuleSaving(false);
        }
    };

    const deleteModule = async (moduleId: string) => {
        if (!detail) return;
        const res = await fetch(`/api/admin/members/${detail.user.id}/therapy-modules?moduleId=${moduleId}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Could not delete the module");
            return;
        }
        showToast("success", "Module deleted.");
        fetchModules(detail.user.id);
    };

    const uploadModuleAttachment = async (file: File) => {
        if (!detail || !moduleForm) return;
        setModuleUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`/api/admin/members/${detail.user.id}/therapy-modules/upload`, { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setModuleForm((f) => (f ? { ...f, attachmentUrl: data.url, attachmentName: data.name } : f));
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Upload failed");
        } finally {
            setModuleUploading(false);
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
            {!embedded && <PageHeader title="Yoga Therapy & Patient Care" subtitle="Review member health intakes, medical conditions, and between-session progress updates." />}

            <div className="flex justify-end gap-2 mb-4">
                <Button variant="secondary" onClick={() => setIntakeFor({ email: "" })}>New intake</Button>
                <Button onClick={() => setRegisterOpen(true)}>Register walk-in client</Button>
            </div>

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
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                    onFilterChange: (key, value) => {
                        if (key === 'status') setStatusFilter(value);
                        setPage(1);
                    },
                }}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
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

                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
                                            🔒 Private Staff Modules
                                        </h3>
                                        {!moduleForm && (
                                            <button
                                                onClick={() => setModuleForm({ id: null, title: "", body: "", enabled: true, attachmentUrl: "", attachmentName: "" })}
                                                className="text-xs font-semibold text-brand hover:text-brand-strong"
                                            >
                                                + Add module
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">
                                        Visible only to admins and therapists — this patient never sees these on their own dashboard.
                                    </p>

                                    {modulesLoading ? (
                                        <p className="text-sm text-gray-400">Loading…</p>
                                    ) : modules.length === 0 && !moduleForm ? (
                                        <p className="text-sm text-gray-400 italic">No private modules yet for this patient.</p>
                                    ) : (
                                        <div className="space-y-2 mb-3">
                                            {modules.map((m) => (
                                                <div key={m.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm text-gray-800">{m.title}</span>
                                                                <Badge tone={m.enabled ? "green" : "gray"}>{m.enabled ? "On" : "Off"}</Badge>
                                                            </div>
                                                            {m.body && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{m.body}</p>}
                                                            {m.attachmentUrl && (
                                                                <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand hover:text-brand-strong mt-1 inline-block">
                                                                    📎 {m.attachmentName || "Attachment"}
                                                                </a>
                                                            )}
                                                            <p className="text-[11px] text-gray-400 mt-1">
                                                                {m.updatedBy ? `Last updated by ${m.updatedBy}` : m.createdBy ? `Added by ${m.createdBy}` : null}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                onClick={() => setModuleForm({ id: m.id, title: m.title, body: m.body || "", enabled: m.enabled, attachmentUrl: m.attachmentUrl || "", attachmentName: m.attachmentName || "" })}
                                                                className="text-xs font-semibold text-brand hover:text-brand-strong"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button onClick={() => deleteModule(m.id)} className="text-xs font-semibold text-red-500 hover:text-red-600">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {moduleForm && (
                                        <div className="rounded-xl border border-hairline p-3 space-y-3">
                                            <div>
                                                <label className={labelClass}>Title</label>
                                                <input
                                                    list="module-title-presets"
                                                    className={inputClass}
                                                    value={moduleForm.title}
                                                    onChange={(e) => setModuleForm((f) => (f ? { ...f, title: e.target.value } : f))}
                                                    placeholder="e.g. Treatment Plan"
                                                />
                                                <datalist id="module-title-presets">
                                                    {MODULE_TITLE_PRESETS.map((p) => <option key={p} value={p} />)}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Private note (optional)</label>
                                                <textarea
                                                    rows={3}
                                                    className={inputClass}
                                                    value={moduleForm.body}
                                                    onChange={(e) => setModuleForm((f) => (f ? { ...f, body: e.target.value } : f))}
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={moduleForm.enabled}
                                                    onChange={(e) => setModuleForm((f) => (f ? { ...f, enabled: e.target.checked } : f))}
                                                    className="h-4 w-4 accent-brand"
                                                />
                                                Enabled — use this to toggle a program/condition on or off for this patient
                                            </label>
                                            <div>
                                                <label className={labelClass}>Private attachment (optional — JPEG/PNG/WebP/PDF)</label>
                                                {moduleForm.attachmentUrl ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <a href={moduleForm.attachmentUrl} target="_blank" rel="noreferrer" className="text-brand font-semibold">
                                                            📎 {moduleForm.attachmentName || "Attachment"}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setModuleForm((f) => (f ? { ...f, attachmentUrl: "", attachmentName: "" } : f))}
                                                            className="text-xs text-gray-400 hover:text-red-500"
                                                        >
                                                            remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                                        disabled={moduleUploading}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            e.target.value = "";
                                                            if (file) await uploadModuleAttachment(file);
                                                        }}
                                                        className="text-xs"
                                                    />
                                                )}
                                                {moduleUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={saveModule} loading={moduleSaving} disabled={!moduleForm.title.trim()}>
                                                    {moduleForm.id ? "Save changes" : "Add module"}
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => setModuleForm(null)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {registerOpen && (
                <EntityFormModal
                    title="Register a walk-in client"
                    submitLabel="Register & activate"
                    fields={WALKIN_FIELDS}
                    initial={{ planKey: "therapy", currency: "INR", amount: 5000, method: "cash" }}
                    onCancel={() => setRegisterOpen(false)}
                    onSubmit={registerWalkin}
                />
            )}

            {credentials && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
                    onClick={() => setCredentials(null)}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="credentials-dialog-title"
                        className="bg-white border border-hairline rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="credentials-dialog-title" className="font-semibold text-gray-800 text-lg mb-2">
                            {credentials.name} is registered
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Share this temporary password with them to log in — it&apos;s shown only once here. They can
                            change it after signing in, or use &ldquo;Forgot password&rdquo; on the login page at any time.
                        </p>
                        <div className="rounded-control border border-hairline bg-gray-50 px-3 py-2 mb-1">
                            <div className="text-xs text-gray-500">{credentials.email}</div>
                            <div className="font-mono text-base text-gray-800 font-semibold select-all">{credentials.tempPassword}</div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-full border border-hairline text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                    navigator.clipboard?.writeText(credentials.tempPassword).catch(() => {});
                                    showToast("success", "Password copied.");
                                }}
                            >
                                Copy password
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors"
                                onClick={() => {
                                    const { name, email } = credentials;
                                    setCredentials(null);
                                    setIntakeFor({ email, fullName: name });
                                }}
                            >
                                Start their case now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {intakeFor && (
                <EntityFormModal
                    title="Case history / assessment"
                    submitLabel="Save"
                    fields={INTAKE_FIELDS}
                    initial={{ email: intakeFor.email, fullName: intakeFor.fullName ?? "", consentGiven: true, submit: true }}
                    onCancel={() => setIntakeFor(null)}
                    onSubmit={saveIntake}
                />
            )}
        </div>
    );
}

type TabKey = "assessments" | "bookings";
const TABS: { key: TabKey; label: string }[] = [
    { key: "assessments", label: "Assessments" },
    { key: "bookings", label: "Sessions & Bookings" },
];

/**
 * Yoga Therapy hub — intake assessments, 1:1 session bookings, and (via a
 * dedicated sub-route, kept separate since it's a distinct long-form editor)
 * patient progress updates. Kept as its own protected module per the
 * sensitivity of the medical/personal information it holds.
 */
function TherapyHub() {
    const tabParam = useSearchParams().get("tab") as TabKey | null;
    const [tab, setTab] = useState<TabKey>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "assessments");

    return (
        <div>
            <PageHeader title="Yoga Therapy" subtitle="Assessments, patient management and 1:1 sessions — kept separate for its sensitive medical data.">
                <a
                    href="/admin/therapy/updates"
                    className="px-3 py-2 text-xs font-semibold rounded-control border border-hairline bg-surface hover:bg-surface-hover text-ink transition-colors"
                >
                    Patient Progress Updates →
                </a>
            </PageHeader>

            <div className="mb-6">
                <Tabs active={tab} onChange={(k) => setTab(k as TabKey)} tabs={TABS} />
            </div>

            {tab === "assessments" && <AdminTherapyIntakesContent embedded />}
            {tab === "bookings" && <AdminBookingsContent embedded />}
        </div>
    );
}

export default function AdminTherapyIntakesPage() {
    return (
        <Suspense fallback={<PageLoading title="Yoga Therapy" />}>
            <TherapyHub />
        </Suspense>
    );
}
