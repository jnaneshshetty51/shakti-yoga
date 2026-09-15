import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing } from "@/theme";
import type { PracticeConsistency } from "@/lib/types";

/** Plain consistency numbers — deliberately not gamified (no points, no "earn more"). */
export function YourPracticeCard({ practice }: { practice: PracticeConsistency | null | undefined }) {
  if (!practice || practice.total === 0) return null;

  return (
    <Pressable onPress={() => router.push("/(tabs)/progress")} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="flame" size={18} color={colors.secondary} />
          <BodyText muted style={styles.eyebrow}>Your Practice</BodyText>
        </View>
        <Heading size="sm" style={{ marginTop: 2 }}>
          {practice.streakDays > 0
            ? `${practice.streakDays}-day consistency`
            : "You're building consistency"}
        </Heading>
        <BodyText muted style={{ marginTop: spacing.xs }}>
          {practice.thisCycle} {practice.thisCycle === 1 ? "practice" : "practices"} this cycle · {practice.total} total
        </BodyText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
});
