import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing, radius } from "@/theme";
import type { Achievement } from "@/lib/types";

export function AchievementGrid({
  achievements,
  earnedCount,
  total,
}: {
  achievements: Achievement[];
  earnedCount: number;
  total: number;
}) {
  if (!achievements.length) return null;

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.head}>
        <Heading size="sm">Badges</Heading>
        <BodyText muted style={{ fontSize: 13 }}>{earnedCount} of {total}</BodyText>
      </View>
      <View style={styles.grid}>
        {achievements.map((a) => {
          const earned = Boolean(a.earnedAt);
          return (
            <View key={a.key} style={[styles.badge, !earned && styles.locked]}>
              <Text style={[styles.icon, !earned && styles.iconLocked]}>{a.icon}</Text>
              <BodyText style={styles.title} numberOfLines={2}>{a.title}</BodyText>
              <BodyText muted style={styles.desc} numberOfLines={2}>{a.description}</BodyText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: {
    width: "31%",
    minWidth: 96,
    flexGrow: 1,
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accent,
  },
  locked: { opacity: 0.45 },
  icon: { fontSize: 26 },
  iconLocked: { opacity: 0.6 },
  title: { fontWeight: "700", fontSize: 12, textAlign: "center", marginTop: spacing.xs },
  desc: { fontSize: 10, textAlign: "center", marginTop: 2 },
});
