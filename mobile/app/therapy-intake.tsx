import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View, TextInput, Pressable, StyleSheet } from "react-native";
import { Screen, Heading, BodyText, Card, Button, LoadingView } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, radius } from "@/theme";

type Status = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "RECOMMENDED" | "RECOMMENDED_WITH_CONDITIONS";

interface Intake {
  status: Status;
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

type Form = Record<
  | "fullName" | "age" | "gender" | "heightCm" | "weightKg"
  | "primaryConcern" | "concernDuration" | "concernDescription"
  | "injuriesSurgeries" | "medicalConditions" | "medications" | "familyHistory" | "priorYogaTherapy"
  | "emergencyContactName" | "emergencyContactPhone",
  string
> & { consentGiven: boolean };

const EMPTY: Form = {
  fullName: "", age: "", gender: "", heightCm: "", weightKg: "",
  primaryConcern: "", concernDuration: "", concernDescription: "",
  injuriesSurgeries: "", medicalConditions: "", medications: "", familyHistory: "", priorYogaTherapy: "",
  consentGiven: false, emergencyContactName: "", emergencyContactPhone: "",
};

const STEPS = ["Personal", "Concern", "History", "Consent", "Review"];

function fromIntake(i: Intake): Form {
  return {
    fullName: i.fullName ?? "", age: i.age?.toString() ?? "", gender: i.gender ?? "",
    heightCm: i.heightCm?.toString() ?? "", weightKg: i.weightKg?.toString() ?? "",
    primaryConcern: i.primaryConcern ?? "", concernDuration: i.concernDuration ?? "",
    concernDescription: i.concernDescription ?? "", injuriesSurgeries: i.injuriesSurgeries ?? "",
    medicalConditions: i.medicalConditions ?? "", medications: i.medications ?? "",
    familyHistory: i.familyHistory ?? "", priorYogaTherapy: i.priorYogaTherapy ?? "",
    consentGiven: i.consentGiven, emergencyContactName: i.emergencyContactName ?? "",
    emergencyContactPhone: i.emergencyContactPhone ?? "",
  };
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <BodyText style={styles.label}>{label}</BodyText>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

export default function TherapyIntakeScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => api.get<{ intake: Intake | null }>("/api/therapy/intake"),
    [],
  );

  const [form, setForm] = useState<Form>(EMPTY);
  const [seeded, setSeeded] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const intake = data?.intake ?? null;

  // Seed the form once from the loaded intake / the signed-in user's name.
  if (!loading && !seeded) {
    if (intake) setForm(fromIntake(intake));
    else if (user) setForm((f) => ({ ...f, fullName: user.name }));
    setSeeded(true);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

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

  const saveDraft = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/api/therapy/intake", payload());
      return true;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your answers");
      return false;
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const next = async () => {
    if (await saveDraft()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    if (!(await saveDraft())) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/api/therapy/intake/submit", {});
      setEditing(false);
      await reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not submit your assessment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Yoga Therapy Assessment" />
        <LoadingView />
      </Screen>
    );
  }

  const showStatus = intake && intake.status !== "DRAFT" && !editing;

  return (
    <Screen>
      <ScreenHeader title="Yoga Therapy Assessment" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {error && <BodyText style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</BodyText>}

        {showStatus ? (
          intake.status === "RECOMMENDED" || intake.status === "RECOMMENDED_WITH_CONDITIONS" ? (
            <Card>
              <Heading size="md">You&rsquo;re recommended for Yoga Therapy</Heading>
              <BodyText muted style={{ marginTop: spacing.sm }}>
                A Shakti therapist has reviewed your assessment.
                {intake.status === "RECOMMENDED_WITH_CONDITIONS" &&
                  " Our team will reach out with a few things to keep in mind before you begin."}
              </BodyText>
              {intake.status === "RECOMMENDED" && intake.reviewNotes && (
                <BodyText style={styles.notes}>{intake.reviewNotes}</BodyText>
              )}
              <BodyText muted style={{ fontSize: 12, marginTop: spacing.md }}>
                To start your plan, open shaktiyoga.in on the web to complete payment.
              </BodyText>
            </Card>
          ) : (
            <Card>
              <Heading size="md">Your assessment is with our team</Heading>
              <BodyText muted style={{ marginTop: spacing.sm }}>
                A Shakti Yoga Therapist is reviewing your answers. We&rsquo;ll reach out with a
                recommendation and next steps soon — usually within a couple of days.
              </BodyText>
              {intake.status === "SUBMITTED" && (
                <Button variant="outline" style={{ marginTop: spacing.md }} onPress={() => setEditing(true)}>
                  Edit my answers
                </Button>
              )}
            </Card>
          )
        ) : (
          <Card>
            <View style={styles.progress}>
              {STEPS.map((label, i) => (
                <View key={label} style={{ flex: 1 }}>
                  <View style={[styles.bar, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
                  <BodyText style={[styles.stepLabel, { color: i === step ? colors.primary : colors.muted }]}>
                    {label}
                  </BodyText>
                </View>
              ))}
            </View>

            {saveError && <BodyText style={{ color: colors.danger, marginBottom: spacing.sm }}>{saveError}</BodyText>}

            {step === 0 && (
              <>
                <Field label="Full name" value={form.fullName} onChangeText={(v) => set("fullName", v)} />
                <Field label="Age" value={form.age} onChangeText={(v) => set("age", v)} keyboardType="number-pad" />
                <Field label="Gender" value={form.gender} onChangeText={(v) => set("gender", v)} placeholder="Female / Male / Non-binary / Prefer not to say" />
                <Field label="Height (cm)" value={form.heightCm} onChangeText={(v) => set("heightCm", v)} keyboardType="number-pad" />
                <Field label="Weight (kg)" value={form.weightKg} onChangeText={(v) => set("weightKg", v)} keyboardType="number-pad" />
                {bmi && <BodyText muted style={{ fontSize: 12 }}>Approximate BMI: {bmi}</BodyText>}
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Main concern you'd like help with" value={form.primaryConcern} onChangeText={(v) => set("primaryConcern", v)} placeholder="e.g. Lower back pain" />
                <Field label="How long have you had this concern?" value={form.concernDuration} onChangeText={(v) => set("concernDuration", v)} placeholder="e.g. 6 months" />
                <Field label="Tell us more about it" value={form.concernDescription} onChangeText={(v) => set("concernDescription", v)} multiline style={[styles.input, styles.multiline]} />
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Past injuries or surgeries (optional)" value={form.injuriesSurgeries} onChangeText={(v) => set("injuriesSurgeries", v)} multiline style={[styles.input, styles.multiline]} />
                <Field label="Existing medical conditions (optional)" value={form.medicalConditions} onChangeText={(v) => set("medicalConditions", v)} multiline style={[styles.input, styles.multiline]} />
                <Field label="Current medications (optional)" value={form.medications} onChangeText={(v) => set("medications", v)} multiline style={[styles.input, styles.multiline]} />
                <Field label="Relevant family medical history (optional)" value={form.familyHistory} onChangeText={(v) => set("familyHistory", v)} multiline style={[styles.input, styles.multiline]} />
                <Field label="Tried Yoga Therapy before? (optional)" value={form.priorYogaTherapy} onChangeText={(v) => set("priorYogaTherapy", v)} multiline style={[styles.input, styles.multiline]} />
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Emergency contact name" value={form.emergencyContactName} onChangeText={(v) => set("emergencyContactName", v)} />
                <Field label="Emergency contact phone" value={form.emergencyContactPhone} onChangeText={(v) => set("emergencyContactPhone", v)} keyboardType="phone-pad" />
                <Pressable style={styles.consent} onPress={() => set("consentGiven", !form.consentGiven)}>
                  <View style={[styles.checkbox, form.consentGiven && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
                  <BodyText muted style={{ flex: 1 }}>
                    I consent to sharing this health information with my assigned Shakti Yoga Therapist for assessment and treatment planning.
                  </BodyText>
                </Pressable>
              </>
            )}

            {step === 4 && (
              <View>
                {([
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
                ] as [string, string][]).map(([label, value]) => (
                  <View key={label} style={styles.reviewRow}>
                    <BodyText style={styles.label}>{label}</BodyText>
                    <BodyText>{value || "—"}</BodyText>
                  </View>
                ))}
                {!form.consentGiven && (
                  <BodyText style={{ color: colors.danger, fontSize: 12, marginTop: spacing.sm }}>
                    Go back and give consent before submitting.
                  </BodyText>
                )}
              </View>
            )}

            <View style={styles.nav}>
              <Button variant="ghost" disabled={step === 0 || saving} onPress={() => setStep((s) => Math.max(s - 1, 0))}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button loading={saving} onPress={next}>Next</Button>
              ) : (
                <Button loading={saving} disabled={!form.consentGiven} onPress={submit}>Submit</Button>
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginBottom: spacing.xs, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  progress: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.lg },
  bar: { height: 5, borderRadius: 999 },
  stepLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginTop: spacing.xs },
  consent: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.xs },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginTop: 2 },
  reviewRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  notes: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg },
});
