import React, { useCallback, useState } from "react";
import { View, TextInput, StyleSheet, Alert } from "react-native";
import { Heading, BodyText, Card, Button, Badge, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface Measurement {
  id: string;
  takenAt: string;
  painScore: number | null;
  mobilityScore: number | null;
  sleepScore: number | null;
  stressScore: number | null;
  weightKg: number | null;
  note: string | null;
  recordedBy: string | null;
}
interface PatientUpdate {
  id: string;
  body: string;
  status: "PENDING" | "REVIEWED";
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const METRICS: { key: keyof Measurement; label: string; betterWhenLower?: boolean }[] = [
  { key: "painScore", label: "Pain", betterWhenLower: true },
  { key: "mobilityScore", label: "Mobility" },
  { key: "sleepScore", label: "Sleep" },
  { key: "stressScore", label: "Stress", betterWhenLower: true },
];

function trend(prev: number | null, latest: number | null, betterWhenLower?: boolean) {
  if (prev == null || latest == null || prev === latest) return null;
  const up = latest > prev;
  const good = betterWhenLower ? !up : up;
  return { arrow: up ? "▲" : "▼", color: good ? colors.primary : colors.danger };
}

export function TherapyProgress() {
  const measured = useResource(() => api.get<{ measurements: Measurement[] }>("/api/therapy/measurements"), []);
  const updates = useResource(() => api.get<{ updates: PatientUpdate[] }>("/api/therapy/updates"), []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = measured.data?.measurements ?? [];
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const send = useCallback(async () => {
    if (draft.trim().length < 3) return;
    setBusy(true);
    try {
      await api.post("/api/therapy/updates", { body: draft.trim() });
      setDraft("");
      updates.reload();
      Alert.alert("Sent", "Your therapist will see this before your next session.");
    } catch (e) {
      Alert.alert("Couldn't send", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [draft, updates]);

  return (
    <View>
      <Heading size="sm" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Your progress</Heading>

      {measured.loading ? (
        <BodyText muted>Loading readings…</BodyText>
      ) : rows.length === 0 ? (
        <BodyText muted style={{ marginBottom: spacing.md }}>
          Your therapist records pain, mobility, sleep and stress readings after your sessions. They will show here.
        </BodyText>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          <BodyText muted style={{ fontSize: 12 }}>
            Latest reading ·{" "}
            {new Date(latest.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </BodyText>
          <View style={styles.metrics}>
            {METRICS.map((m) => {
              const v = latest[m.key] as number | null;
              if (v == null) return null;
              const t = trend((prev?.[m.key] ?? null) as number | null, v, m.betterWhenLower);
              return (
                <View key={m.key as string} style={styles.metric}>
                  <BodyText muted style={{ fontSize: 12 }}>{m.label}</BodyText>
                  <BodyText style={{ fontWeight: "700", fontSize: 18 }}>
                    {v}
                    <BodyText muted style={{ fontSize: 12 }}>/10</BodyText>
                    {t ? <BodyText style={{ color: t.color, fontSize: 13 }}> {t.arrow}</BodyText> : null}
                  </BodyText>
                </View>
              );
            })}
            {latest.weightKg != null && (
              <View style={styles.metric}>
                <BodyText muted style={{ fontSize: 12 }}>Weight</BodyText>
                <BodyText style={{ fontWeight: "700", fontSize: 18 }}>{latest.weightKg} kg</BodyText>
              </View>
            )}
          </View>
          {latest.note ? <BodyText muted style={{ marginTop: spacing.sm, fontSize: 13 }}>{latest.note}</BodyText> : null}
        </Card>
      )}

      <Heading size="sm" style={{ marginBottom: spacing.sm }}>Send an update to your therapist</Heading>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="How has your body felt since the last session?"
        placeholderTextColor={colors.muted}
        multiline
      />
      <Button loading={busy} disabled={draft.trim().length < 3} onPress={send} style={{ marginTop: spacing.sm }}>
        Send update
      </Button>

      {(updates.data?.updates ?? []).length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          {updates.data!.updates.map((u) => (
            <Card key={u.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.rowBetween}>
                <BodyText muted style={{ fontSize: 12 }}>
                  {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </BodyText>
                <Badge tone={u.status === "REVIEWED" ? "success" : "warning"}>
                  {u.status === "REVIEWED" ? "Reviewed" : "Sent"}
                </Badge>
              </View>
              <BodyText style={{ marginTop: 2 }}>{u.body}</BodyText>
              {u.reviewNote ? (
                <View style={styles.reply}>
                  <BodyText muted style={{ fontSize: 12 }}>{u.reviewedBy ?? "Your therapist"} replied</BodyText>
                  <BodyText style={{ marginTop: 2 }}>{u.reviewNote}</BodyText>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {measured.error && updates.error ? (
        <EmptyState title="Couldn't load your progress" subtitle={measured.error} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.sm },
  metric: { minWidth: 72 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reply: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 72,
    textAlignVertical: "top",
  },
});
