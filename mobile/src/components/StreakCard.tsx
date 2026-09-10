import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing, radius } from "@/theme";
import type { HomeStreak } from "@/lib/types";

/** Weekly consistency widget — streak length + classes-this-week toward a goal. */
export function StreakCard({ streak }: { streak: HomeStreak | null | undefined }) {
  if (!streak) return null;

  const goal = streak.starterLimit ?? 3;
  const pct = goal > 0 ? Math.min(1, streak.classesThisWeek / goal) : 0;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={styles.row}>
        <Ionicons name="flame" size={20} color={colors.secondary} />
        <Heading size="sm">
          {streak.currentStreakWeeks > 0
            ? `${streak.currentStreakWeeks}-week streak`
            : "Start a streak this week"}
        </Heading>
      </View>
      <BodyText muted style={{ marginTop: spacing.xs }}>
        {streak.classesThisWeek} {streak.classesThisWeek === 1 ? "class" : "classes"} this week
        {streak.starterLimit != null ? ` · ${streak.starterLimit}/week on Starter` : ""}
      </BodyText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
});
