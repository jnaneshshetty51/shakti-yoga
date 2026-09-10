import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText, Badge } from "@/components/ui";
import { colors, spacing, radius } from "@/theme";
import type { HomeChallenge } from "@/lib/types";

/** The member's active (joined, unfinished) challenge with a progress bar. */
export function ChallengeCard({ challenge }: { challenge: HomeChallenge | null | undefined }) {
  if (!challenge) return null;

  const pct = challenge.goalTarget > 0 ? Math.min(1, challenge.progress / challenge.goalTarget) : 0;

  return (
    <Pressable onPress={() => router.push("/challenges")}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}>
          <Ionicons name="trophy-outline" size={18} color={colors.secondary} />
          <BodyText muted style={styles.eyebrow}>Your Challenge</BodyText>
        </View>
        <Heading size="sm" style={{ marginTop: 2 }}>{challenge.title}</Heading>
        <BodyText muted style={{ marginTop: spacing.xs }}>
          {challenge.progress} / {challenge.goalTarget} {challenge.goalLabel}
          {challenge.completed ? "" : ` · ${challenge.daysLeft} ${challenge.daysLeft === 1 ? "day" : "days"} left`}
        </BodyText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        {challenge.completed && (
          <View style={{ marginTop: spacing.sm }}>
            <Badge tone="success">Completed</Badge>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
});
