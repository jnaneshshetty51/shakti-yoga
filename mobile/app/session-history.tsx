import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Screen, BodyText, Card, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";
import type { SessionBalance } from "@/lib/types";

type AttendanceStatus = "CHECKED_IN" | "PRESENT" | "ABSENT";
interface HistoryRow {
  id: string;
  date: string;
  batchName: string;
  status: AttendanceStatus;
}

const STATUS: Record<AttendanceStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  PRESENT: { label: "Attended", tone: "success" },
  CHECKED_IN: { label: "Checked in", tone: "warning" },
  ABSENT: { label: "Missed", tone: "danger" },
};

export default function SessionHistoryScreen() {
  const { data, loading, error } = useResource(
    () => api.get<{ sessionCredits: SessionBalance | null; history: HistoryRow[] }>("/api/sessions/history"),
    [],
  );

  return (
    <Screen>
      <ScreenHeader title="Session History" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your history" subtitle={error} />
      ) : !data || data.history.length === 0 ? (
        <EmptyState title="No classes yet" subtitle="Your attended and checked-in classes will show here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <SessionBalanceCard balance={data.sessionCredits} style={{ marginBottom: spacing.md }} />
          <Card>
            {data.history.map((r, i) => {
              const s = STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
              return (
                <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <BodyText style={{ fontWeight: "700" }}>{r.batchName}</BodyText>
                    <BodyText muted style={{ fontSize: 12 }}>
                      {new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </BodyText>
                  </View>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </View>
              );
            })}
          </Card>
          <BodyText muted style={styles.note}>
            Only classes a teacher confirmed as attended count against your cycle.
          </BodyText>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#0002" },
  note: { fontSize: 12, marginTop: spacing.md, textAlign: "center" },
});
