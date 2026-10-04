import React, { useMemo } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";
import type { SessionBalance } from "@/lib/types";

type AttendanceStatus = "CHECKED_IN" | "PRESENT" | "ABSENT";
interface HistoryRow {
  id: string;
  date: string;
  batchName: string;
  batchTime: string;
  teacherName: string;
  status: AttendanceStatus;
}

interface SessionStats {
  totalThisCycle: number;
  totalAllTime: number;
  currentStreak: number;
}

const STATUS: Record<AttendanceStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral"; color: string }> = {
  PRESENT: { label: "Attended", tone: "success", color: "#10B981" },
  CHECKED_IN: { label: "Checked in", tone: "warning", color: colors.secondary },
  ABSENT: { label: "Missed", tone: "danger", color: colors.danger },
};

function StatBox({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconCircle, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Heading size="md" style={{ color: colors.text }}>{value}</Heading>
      <BodyText muted style={styles.statLabel}>{label}</BodyText>
    </View>
  );
}

export default function SessionHistoryScreen() {
  const { data, loading, error, reload } = useResource(
    () =>
      api.get<{
        sessionCredits: SessionBalance | null;
        history: HistoryRow[];
        stats: SessionStats;
      }>("/api/sessions/history"),
    [],
  );

  // Group history by month
  const grouped = useMemo(() => {
    if (!data?.history) return [];
    const groups: { label: string; rows: HistoryRow[] }[] = [];
    let currentLabel = "";

    for (const row of data.history) {
      const d = new Date(row.date);
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (label !== currentLabel) {
        groups.push({ label, rows: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].rows.push(row);
    }
    return groups;
  }, [data?.history]);

  return (
    <Screen>
      <ScreenHeader title="Session History" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your history" subtitle={error} onRetry={reload} />
      ) : !data || data.history.length === 0 ? (
        <EmptyState title="No classes yet" subtitle="Your attended and checked-in classes will show here." />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Stats summary */}
          {data.stats && (
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <StatBox
                  icon="flame-outline"
                  label="This Cycle"
                  value={data.stats.totalThisCycle}
                  color={colors.secondary}
                />
                <View style={styles.statDivider} />
                <StatBox
                  icon="trophy-outline"
                  label="All Time"
                  value={data.stats.totalAllTime}
                  color={colors.primary}
                />
                <View style={styles.statDivider} />
                <StatBox
                  icon="flash-outline"
                  label="Streak"
                  value={data.stats.currentStreak > 0 ? `${data.stats.currentStreak}🔥` : "0"}
                  color="#F59E0B"
                />
              </View>
            </Card>
          )}

          {/* Session credits balance */}
          <SessionBalanceCard balance={data.sessionCredits} style={{ marginBottom: spacing.md }} />

          {/* Grouped history */}
          {grouped.map((group) => (
            <View key={group.label}>
              <BodyText style={styles.monthLabel}>{group.label.toUpperCase()}</BodyText>
              <Card style={styles.historyCard}>
                {group.rows.map((r, i) => {
                  const s = STATUS[r.status] ?? { label: r.status, tone: "neutral" as const, color: colors.muted };
                  return (
                    <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                      {/* Status accent */}
                      <View style={[styles.statusAccent, { backgroundColor: s.color }]} />

                      <View style={styles.rowContent}>
                        {/* Top: batch name + badge */}
                        <View style={styles.rowTop}>
                          <BodyText style={styles.batchName} numberOfLines={1}>
                            {r.batchName}
                          </BodyText>
                          <Badge tone={s.tone}>{s.label}</Badge>
                        </View>

                        {/* Bottom: date, time, teacher */}
                        <View style={styles.rowMeta}>
                          <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                            <BodyText muted style={styles.metaText}>
                              {new Date(r.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </BodyText>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={12} color={colors.muted} />
                            <BodyText muted style={styles.metaText}>{r.batchTime}</BodyText>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={12} color={colors.muted} />
                            <BodyText muted style={styles.metaText} numberOfLines={1}>
                              {r.teacherName}
                            </BodyText>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))}

          <BodyText muted style={styles.note}>
            Only classes a teacher confirmed as attended count against your cycle.
          </BodyText>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  statsCard: {
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    backgroundColor: colors.border,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  historyCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  statusAccent: {
    width: 3,
  },
  rowContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchName: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowMeta: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  note: {
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
