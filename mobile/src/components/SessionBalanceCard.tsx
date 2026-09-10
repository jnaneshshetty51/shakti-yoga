import React from "react";
import { View, StyleSheet } from "react-native";
import { BodyText, Card } from "@/components/ui";
import { colors, spacing } from "@/theme";
import type { SessionBalance } from "@/lib/types";

function refreshDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

/** "14 / 20 sessions this cycle" with a progress bar. Render nothing for uncapped plans. */
export function SessionBalanceCard({ balance, style }: { balance: SessionBalance | null | undefined; style?: object }) {
  if (!balance) return null;
  const pct = balance.perCycle > 0 ? Math.max(0, Math.min(1, balance.remaining / balance.perCycle)) : 0;

  return (
    <Card style={style}>
      <BodyText muted style={styles.eyebrow}>Sessions this cycle</BodyText>
      <BodyText style={styles.count}>
        {balance.remaining}
        <BodyText muted style={styles.total}> / {balance.perCycle} remaining</BodyText>
      </BodyText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: balance.remaining === 0 ? colors.danger : colors.primary }]} />
      </View>
      <BodyText muted style={styles.note}>
        {balance.remaining === 0
          ? `Refreshes on ${refreshDate(balance.cycleEnd)}`
          : `Unused sessions don't roll over · refreshes ${refreshDate(balance.cycleEnd)}`}
      </BodyText>
    </Card>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  count: { fontSize: 26, fontWeight: "800", color: colors.text },
  total: { fontSize: 14, fontWeight: "400" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#0001", overflow: "hidden", marginTop: spacing.sm },
  fill: { height: 8, borderRadius: 4 },
  note: { fontSize: 12, marginTop: spacing.xs },
});
