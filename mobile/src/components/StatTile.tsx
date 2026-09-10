import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, BodyText } from "@/components/ui";
import { colors, spacing } from "@/theme";

/** Compact metric card for a 2-up grid. */
export function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card style={styles.tile}>
      <BodyText muted style={styles.label}>{label}</BodyText>
      <BodyText style={styles.value}>{value}</BodyText>
      {sub ? <BodyText muted style={styles.sub}>{sub}</BodyText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: "45%" },
  label: { textTransform: "uppercase", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  value: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: spacing.xs },
  sub: { fontSize: 12, marginTop: 2 },
});
