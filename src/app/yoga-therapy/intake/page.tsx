"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Breadcrumbs from "@/components/Breadcrumbs";

interface IntakeData {
    status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "RECOMMENDED" | "RECOMMENDED_WITH_CONDITIONS";
    fullName: string | null;
    age: number | null;
    gender: string | null;
    heightCm: number | null;
    weightKg: number | null;
    primaryConcern: string | null;
    concernDuration: string | null;
    concernDescription: string | null;
    injuriesSurgeries: string | null;
    medicalConditions: string | null;
    medications: string | null;
    familyHistory: string | null;
    priorYogaTherapy: string | null;
    consentGiven: boolean;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    reviewNotes: string | null;
}

type FormState = {
    fullName: string;
    age: string;
    gender: string;
    heightCm: string;
    weightKg: string;
    primaryConcern: string;
    concernDuration: string;
    concernDescription: string;
    injuriesSurgeries: string;
    medicalConditions: string;
    medications: string;
    familyHistory: string;
    priorYogaTherapy: string;
    consentGiven: boolean;
    emergencyContactName: string;
    emergencyContactPhone: string;
};

const EMPTY: FormState = {
    fullName: "", age: "", gender: "", heightCm: "", weightKg: "",
    primaryConcern: "", concernDuration: "", concernDescription: "",
    injuriesSurgeries: "", medicalConditions: "", medications: "", familyHistory: "", priorYogaTherapy: "",
    consentGiven: false, emergencyContactName: "", emergencyContactPhone: "",
};

const STEPS = ["Personal details", "Your concern", "Medical history", "Consent", "Review"];

const inputCls = "w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider";

function fromIntake(i: IntakeData): FormState {
    return {
        fullName: i.fullName ?? "",
        age: i.age?.toString() ?? "",
        gender: i.gender ?? "",
        heightCm: i.heightCm?.toString() ?? "",
        weightKg: i.weightKg?.toString() ?? "",
        primaryConcern: i.primaryConcern ?? "",
        concernDuration: i.concernDuration ?? "",
        concernDescription: i.concernDescription ?? "",
        injuriesSurgeries: i.injuriesSurgeries ?? "",
        medicalConditions: i.medicalConditions ?? "",
        medications: i.medications ?? "",
        familyHistory: i.familyHistory ?? "",
        priorYogaTherapy: i.priorYogaTherapy ?? "",
        consentGiven: i.consentGiven,
        emergencyContactName: i.emergencyContactName ?? "",
        emergencyContactPhone: i.emergencyContactPhone ?? "",
    };
}

function StatusScreen({ intake, onEdit }: { intake: IntakeData; onEdit: () => void }) {
    if (intake.status === "RECOMMENDED" || intake.status === "RECOMMENDED_WITH_CONDITIONS") {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-green-500 text-center max-w-2xl mx-auto">
                <div className="text-4xl mb-3">✨</div>
                <h2 className="font-serif text-2xl text-text mb-2">You&rsquo;re recommended for Yoga Therapy</h2>
                <p className="text-text/70 mb-4">
                    A Shakti therapist has reviewed your assessment.
                    {intake.status === "RECOMMENDED_WITH_CONDITIONS" && " There are a few things to keep in mind before you begin:"}
                </p>
                {intake.reviewNotes && (
                    <p className="text-left text-sm text-text/70 bg-accent/20 border border-gray-200 rounded p-4 mb-6 whitespace-pre-wrap">
                        {intake.reviewNotes}
                    </p>
                )}
                <Link
                    href="/checkout?plan=therapy"
                    className="inline-block px-8 py-4 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-md"
                >
                    Proceed to payment
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-primary text-center max-w-2xl mx-auto">
            <div className="text-4xl mb-3">🙏</div>
            <h2 className="font-serif text-2xl text-text mb-2">Your assessment is with our team</h2>
            <p className="text-text/70 mb-6">
                A Shakti Yoga Therapist is reviewing your answers. We&rsquo;ll reach out with a recommendation and next
                steps soon — usually within a couple of days.
            </p>
            {intake.status === "SUBMITTED" && (
                <button
                    onClick={onEdit}
                    className="text-sm font-bold text-primary uppercase tracking-widest hover:underline"
                >
                    Edit my answers
                </button>
            )}
        </div>
    );
}

export default function TherapyIntakePage() {
    const { user, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [intake, setIntake] = useState<IntakeData | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/therapy/intake");
            if (!res.ok) throw new Error("Could not load your assessment");
            const data = await res.json();
            if (data.intake) {
                setIntake(data.intake);
                setForm(fromIntake(data.intake));
            } else if (user) {
                setForm((f) => ({ ...f, fullName: user.name }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) load();
        else setLoading(false);
    }, [user, load]);

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

    const bmi = useMemo(() => {
        const h = parseFloat(form.heightCm) / 100;
        const w = parseFloat(form.weightKg);
        if (!h || !w) return null;
        return (w / (h * h)).toFixed(1);
    }, [form.heightCm, form.weightKg]);

    const payload = () => ({
        fullName: form.fullName || undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        primaryConcern: form.primaryConcern || undefined,
        concernDuration: form.concernDuration || undefined,
        concernDescription: form.concernDescription || undefined,
        injuriesSurgeries: form.injuriesSurgeries || undefined,
        medicalConditions: form.medicalConditions || undefined,
        medications: form.medications || undefined,
        familyHistory: form.familyHistory || undefined,
        priorYogaTherapy: form.priorYogaTherapy || undefined,
        consentGiven: form.consentGiven,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
    });

    const saveDraft = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/therapy/intake", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload()),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not save your answers");
            setIntake(data.intake);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your answers");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const next = async () => {
        const ok = await saveDraft();
        if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };
    const back = () => setStep((s) => Math.max(s - 1, 0));

    const submit = async () => {
        const ok = await saveDraft();
        if (!ok) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/therapy/intake/submit", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not submit your assessment");
            setIntake(data.intake);
            setEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not submit your assessment");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return <main className="min-h-screen flex items-center justify-center bg-accent/30"><p className="text-text/50">Loading…</p></main>;
    }

    if (!user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl text-center">
                    <h1 className="font-serif text-3xl text-primary mb-4">Create Account</h1>
                    <p className="text-text/70 mb-8">Log in or sign up to begin your Yoga Therapy assessment.</p>
                    <div className="space-y-4">
                        <Link href={`/signup?from=${encodeURIComponent("/yoga-therapy/intake")}`} className="block w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                            Create Account
                        </Link>
                        <Link href={`/login?from=${encodeURIComponent("/yoga-therapy/intake")}`} className="block w-full py-3 border border-primary text-primary font-bold uppercase tracking-widest rounded hover:bg-primary/5 transition-colors">
                            Log In
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const showStatusScreen = intake && intake.status !== "DRAFT" && !editing;

    return (
        <main className="min-h-screen bg-accent/30 py-16 px-4">
            <div className="max-w-2xl mx-auto">
                <Breadcrumbs items={[{ label: "Yoga Therapy", href: "/yoga-therapy" }, { label: "Assessment" }]} />
                <div className="text-center mb-10">
                    <h1 className="font-serif text-4xl text-primary mb-3">Yoga Therapy Assessment</h1>
                    <p className="text-text/70">
                        A few questions so we can match you with the right therapist and approach. Takes about 5 minutes.
                    </p>
                </div>

                {showStatusScreen ? (
                    <StatusScreen intake={intake} onEdit={() => setEditing(true)} />
                ) : (
                    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border-t-4 border-primary">
                        {/* Progress indicator */}
                        <div className="flex items-center gap-1.5 mb-8">
                            {STEPS.map((label, i) => (
                                <div key={label} className="flex-1">
                                    <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} />
                                    <div className={`mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${i === step ? "text-primary" : "text-text/40"} hidden sm:block`}>
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

                        {step === 0 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>Full name</label>
                                    <input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Age</label>
                                        <input type="number" min={0} className={inputCls} value={form.age} onChange={(e) => set("age", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Gender</label>
                                        <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                                            <option value="">Select…</option>
                                            <option>Female</option>
                                            <option>Male</option>
                                            <option>Non-binary</option>
                                            <option>Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Height (cm)</label>
                                        <input type="number" min={0} className={inputCls} value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Weight (kg)</label>
                                        <input type="number" min={0} className={inputCls} value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
                                    </div>
                                </div>
                                {bmi && <p className="text-xs text-text/50">Approximate BMI: {bmi}</p>}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>What&rsquo;s the main concern you&rsquo;d like help with?</label>
                                    <input className={inputCls} placeholder="e.g. Lower back pain" value={form.primaryConcern} onChange={(e) => set("primaryConcern", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>How long have you had this concern?</label>
                                    <input className={inputCls} placeholder="e.g. 6 months" value={form.concernDuration} onChange={(e) => set("concernDuration", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Tell us more about it</label>
                                    <textarea rows={5} className={inputCls} value={form.concernDescription} onChange={(e) => set("concernDescription", e.target.value)} />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>Past injuries or surgeries (optional)</label>
                                    <textarea rows={2} className={inputCls} value={form.injuriesSurgeries} onChange={(e) => set("injuriesSurgeries", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Existing medical conditions (optional)</label>
                                    <textarea rows={2} className={inputCls} value={form.medicalConditions} onChange={(e) => set("medicalConditions", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Current medications (optional)</label>
                                    <textarea rows={2} className={inputCls} value={form.medications} onChange={(e) => set("medications", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Relevant family medical history (optional)</label>
                                    <textarea rows={2} className={inputCls} value={form.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Have you tried Yoga Therapy before? (optional)</label>
                                    <textarea rows={2} className={inputCls} value={form.priorYogaTherapy} onChange={(e) => set("priorYogaTherapy", e.target.value)} />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Emergency contact name</label>
                                        <input className={inputCls} value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Emergency contact phone</label>
                                        <input className={inputCls} value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
                                    </div>
                                </div>
                                <label className="flex items-start gap-3 text-sm text-text/70 pt-2">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={form.consentGiven}
                                        onChange={(e) => set("consentGiven", e.target.checked)}
                                    />
                                    I consent to sharing this health information with my assigned Shakti Yoga Therapist for
                                    the purpose of assessment and treatment planning.
                                </label>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-5 text-sm">
                                {[
                                    ["Full name", form.fullName], ["Age", form.age], ["Gender", form.gender],
                                    ["Height / Weight", `${form.heightCm || "—"} cm / ${form.weightKg || "—"} kg`],
                                    ["Primary concern", form.primaryConcern], ["Duration", form.concernDuration],
                                    ["Description", form.concernDescription],
                                    ["Injuries / surgeries", form.injuriesSurgeries || "—"],
                                    ["Medical conditions", form.medicalConditions || "—"],
                                    ["Medications", form.medications || "—"],
                                    ["Family history", form.familyHistory || "—"],
                                    ["Prior Yoga Therapy", form.priorYogaTherapy || "—"],
                                    ["Emergency contact", `${form.emergencyContactName || "—"} · ${form.emergencyContactPhone || "—"}`],
                                ].map(([label, value]) => (
                                    <div key={label} className="border-b border-gray-100 pb-3">
                                        <div className="text-xs font-bold text-text/40 uppercase tracking-wider">{label}</div>
                                        <div className="text-text/80 mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
                                    </div>
                                ))}
                                {!form.consentGiven && (
                                    <p className="text-red-600 text-xs">Please go back and give consent before submitting.</p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-8">
                            <button
                                type="button"
                                onClick={back}
                                disabled={step === 0 || saving}
                                className="text-sm font-bold text-text/50 uppercase tracking-widest hover:text-text disabled:opacity-30"
                            >
                                Back
                            </button>
                            {step < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={next}
                                    disabled={saving}
                                    className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-70"
                                >
                                    {saving ? "Saving…" : "Next"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={saving || !form.consentGiven}
                                    className="px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Submitting…" : "Submit assessment"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
