import React from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { StatTile } from "@/components/StatTile";
import { AchievementGrid } from "@/components/AchievementGrid";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing } from "@/theme";
import type { ProgressResponse, AchievementsResponse } from "@/lib/types";

function monthYear(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function momSub(thisMonth: number, lastMonth: number): string {
  const d = thisMonth - lastMonth;
  if (d === 0) return "same as last month";
  return `${d > 0 ? "+" : ""}${d} vs last month`;
}

function LinkRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.linkRow}>
        <Ionicons name={icon} size={18} color={colors.primary} style={{ width: 26 }} />
        <BodyText style={{ flex: 1, fontWeight: "700" }}>{label}</BodyText>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const progress = useResource(() => api.get<ProgressResponse>("/api/progress"), []);
  const badges = useResource(() => api.get<AchievementsResponse>("/api/me/achievements").catch(() => null), []);

  const data = progress.data;
  const isTherapy = user?.role === "member_therapy";
  const maxWeek = Math.max(1, ...(data?.weeks ?? []).map((w) => w.count));

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">My Yoga Journey</Heading>
      </View>
      {progress.loading ? (
        <LoadingView />
      ) : progress.error ? (
        <EmptyState title="Couldn't load your progress" subtitle={progress.error} />
      ) : !data ? (
        <EmptyState title="Nothing to show yet" subtitle="Your stats appear once you start attending." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={
            <RefreshControl
              refreshing={progress.loading}
              onRefresh={() => { progress.reload(); badges.reload(); }}
            />
          }
        >
          <SessionBalanceCard balance={data.sessionCredits} style={{ marginBottom: spacing.md }} />

          <View style={styles.grid}>
            <StatTile
              label="Classes this month"
              value={data.totals.classesThisMonth}
              sub={momSub(data.totals.classesThisMonth, data.totals.classesLastMonth)}
            />
            <StatTile label="Classes all-time" value={data.totals.classesAllTime} />
            <StatTile label="Current streak" value={`${data.totals.currentStreakWeeks} wk`} />
            <StatTile label="Longest streak" value={`${data.totals.longestStreakWeeks} wk`} />
            {(isTherapy || data.totals.sessionsCompleted > 0) && (
              <StatTile label="Therapy sessions" value={data.totals.sessionsCompleted} sub="completed" />
            )}
            <StatTile label="Member since" value={monthYear(data.memberSince)} />
          </View>

          <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
            <BodyText muted style={styles.eyebrow}>Last 8 weeks</BodyText>
            {data.weeks.map((w) => (
              <View key={w.key} style={styles.weekRow}>
                <BodyText muted style={{ width: 56 }}>{w.label}</BodyText>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { width: `${(w.count / maxWeek) * 100}%` }]} />
                </View>
                <BodyText style={{ width: 20, textAlign: "right" }}>{w.count}</BodyText>
              </View>
            ))}
          </Card>

          {badges.data && (
            <AchievementGrid
              achievements={badges.data.achievements}
              earnedCount={badges.data.earnedCount}
              total={badges.data.total}
            />
          )}

          <LinkRow icon="trophy-outline" label="Challenges" onPress={() => router.push("/challenges")} />
          <View style={{ height: spacing.sm }} />
          <LinkRow icon="time-outline" label="Session history" onPress={() => router.push("/session-history")} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  weekRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
  bar: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
