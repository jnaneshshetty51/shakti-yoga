import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, BodyText } from "@/components/ui";
import { formatClassTime } from "@/lib/format";
import { colors, spacing, radius } from "@/theme";
import type { ClassView } from "@/lib/types";

/** The day's Everyday Yoga batches at a glance — not the whole week. */
export function TodaysScheduleCard({ today, nextId }: { today: ClassView[]; nextId: string | null }) {
  if (today.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <BodyText muted style={styles.eyebrow}>Today</BodyText>
        <Pressable onPress={() => router.push("/calendar")} hitSlop={8} style={styles.viewAll}>
          <BodyText style={styles.viewAllText}>View calendar</BodyText>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {today.map((c, i) => {
        const isNext = c.id === nextId;
        return (
          <View key={c.id} style={[styles.row, i < today.length - 1 && styles.rowDivider]}>
            <BodyText style={styles.time}>{formatClassTime(c.startsAt)}</BodyText>
            <BodyText style={[styles.title, isNext && styles.titleNext]} numberOfLines={1}>
              {c.batchName}
            </BodyText>
            {c.attended ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                <BodyText style={styles.statusText}>Completed</BodyText>
              </View>
            ) : isNext ? (
              <View style={styles.statusRow}>
                <View style={styles.nextDot} />
                <BodyText style={[styles.statusText, styles.statusTextNext]}>Next</BodyText>
              </View>
            ) : (
              <BodyText muted style={styles.statusText}>Available</BodyText>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  time: { width: 68, fontSize: 13, color: colors.muted, fontWeight: "600" },
  title: { flex: 1, fontSize: 14, fontWeight: "500" },
  titleNext: { fontWeight: "700", color: colors.primary },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusTextNext: { color: colors.primary },
  nextDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
});
