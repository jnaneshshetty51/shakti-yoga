import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";
import type { HomeStreak } from "@/lib/types";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Weekly consistency widget — streak length + 7-day weekly visual cadence. */
export function StreakCard({ streak }: { streak: HomeStreak | null | undefined }) {
  if (!streak) return null;

  const goal = streak.starterLimit ?? 3;
  const pct = goal > 0 ? Math.min(1, streak.classesThisWeek / goal) : 0;
  const attendedCount = streak.classesThisWeek;

  // Determine current day of week (0 = Monday in our array index, standard JS Sunday = 0)
  const jsDay = new Date().getDay();
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.flameCircle}>
          <Ionicons name="flame" size={20} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Heading size="sm" style={styles.title}>
            {streak.currentStreakWeeks > 0
              ? `${streak.currentStreakWeeks}-Week Streak`
              : "Build Your Weekly Consistency"}
          </Heading>
          <BodyText muted style={styles.subtitle}>
            {streak.classesThisWeek} {streak.classesThisWeek === 1 ? "class" : "classes"} this week
            {streak.starterLimit != null ? ` · ${streak.starterLimit}/week goal` : ` · ${goal}/week target`}
          </BodyText>
        </View>
        <View style={styles.badgePill}>
          <BodyText style={styles.badgeText}>{Math.round(pct * 100)}%</BodyText>
        </View>
      </View>

      {/* 7-Day Visual Flow Dots */}
      <View style={styles.daysRow}>
        {DAYS.map((day, index) => {
          const isAttended = index < attendedCount;
          const isCurrent = index === currentDayIndex;

          return (
            <View key={index} style={styles.dayCol}>
              <BodyText style={[styles.dayLabel, isCurrent && styles.dayLabelCurrent]}>
                {day}
              </BodyText>
              <View
                style={[
                  styles.dayDot,
                  isAttended && styles.dayDotActive,
                  isCurrent && !isAttended && styles.dayDotCurrent,
                ]}
              >
                {isAttended && <Ionicons name="checkmark" size={10} color={colors.white} />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flameCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dayCol: {
    alignItems: "center",
    gap: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  dayLabelCurrent: {
    color: colors.secondary,
    fontWeight: "800",
  },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotActive: {
    backgroundColor: colors.primary,
  },
  dayDotCurrent: {
    borderWidth: 1.5,
    borderColor: colors.secondary,
    backgroundColor: "transparent",
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
