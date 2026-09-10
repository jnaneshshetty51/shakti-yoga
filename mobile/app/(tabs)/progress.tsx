import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";
import type { SessionBalance } from "@/lib/types";

interface ProgressResponse {
  credits: number;
  sessionCredits: SessionBalance | null;
  totals: {
    classesAllTime: number;
    classesThisMonth: number;
    sessionsCompleted: number;
    currentStreakWeeks: number;
  };
  weeks: { key: string; label: string; count: number }[];
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const { data, loading, error } = useResource(() => api.get<ProgressResponse>("/api/progress"), []);

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">My Yoga Journey</Heading>
      </View>
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your progress" subtitle={error} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <SessionBalanceCard balance={data?.sessionCredits} style={{ marginBottom: spacing.md }} />

          <Card style={{ marginBottom: spacing.md }}>
            <BodyText muted style={styles.eyebrow}>
              {data?.sessionCredits ? "Attendance" : "Sessions"}
            </BodyText>
            <Heading size="md">
              {data?.sessionCredits
                ? `${data.totals.classesAllTime} classes attended`
                : `${data?.credits ?? user?.credits ?? 0} remaining`}
            </Heading>
            <BodyText muted style={{ marginTop: spacing.xs }}>
              {data?.sessionCredits
                ? `${data.totals.currentStreakWeeks ?? 0}-week streak`
                : `${data?.totals.classesAllTime ?? 0} classes attended · ${data?.totals.currentStreakWeeks ?? 0}-week streak`}
            </BodyText>
          </Card>

          <Card style={{ marginBottom: spacing.md }}>
            <BodyText muted style={styles.eyebrow}>Last 8 weeks</BodyText>
            {(data?.weeks ?? []).map((w) => (
              <View key={w.key} style={styles.weekRow}>
                <BodyText muted style={{ flex: 1 }}>{w.label}</BodyText>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { width: `${Math.min(100, w.count * 20)}%` }]} />
                </View>
                <BodyText style={{ width: 24, textAlign: "right" }}>{w.count}</BodyText>
              </View>
            ))}
          </Card>

          <Pressable onPress={() => router.push("/session-history")}>
            <Card style={styles.linkRow}>
              <BodyText style={{ flex: 1, fontWeight: "700" }}>Session history</BodyText>
              <Ionicons name="chevron-forward" size={18} color="#8A8F86" />
            </Card>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  weekRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  barTrack: { flex: 2, height: 8, backgroundColor: "#0001", borderRadius: 4, overflow: "hidden" },
  bar: { height: 8, backgroundColor: "#4A6741" },
  linkRow: { flexDirection: "row", alignItems: "center" },
});
