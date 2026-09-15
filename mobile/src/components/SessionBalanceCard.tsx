import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { BodyText, Card, Button } from "@/components/ui";
import { colors, spacing } from "@/theme";
import type { SessionBalance } from "@/lib/types";

function refreshDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

interface Props {
  balance: SessionBalance | null | undefined;
  style?: object;
  /** Plan name header + a "View Membership" button — used on Home; other callers (Progress, Classes) omit it and get the plain sessions-only card. */
  planLabel?: string;
}

/** "14 / 20 sessions this cycle" with a progress bar. Render nothing for uncapped plans. */
export function SessionBalanceCard({ balance, style, planLabel }: Props) {
  if (!balance) return null;
  const pct = balance.perCycle > 0 ? Math.max(0, Math.min(1, balance.remaining / balance.perCycle)) : 0;

  return (
    <Card style={style}>
      {planLabel ? (
        <Pressable onPress={() => router.push("/membership")}>
          <BodyText style={styles.planLabel}>{planLabel}</BodyText>
        </Pressable>
      ) : (
        <BodyText muted style={styles.eyebrow}>Sessions this cycle</BodyText>
      )}
      <BodyText style={styles.count}>
        {balance.remaining}
        <BodyText muted style={styles.total}> / {balance.perCycle} remaining</BodyText>
      </BodyText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: balance.remaining === 0 ? colors.danger : colors.primary }]} />
      </View>
      <BodyText muted style={styles.note}>
        {planLabel
          ? `Valid until ${refreshDate(balance.cycleEnd)}`
          : balance.remaining === 0
          ? `Refreshes on ${refreshDate(balance.cycleEnd)}`
          : `Unused sessions don't roll over · refreshes ${refreshDate(balance.cycleEnd)}`}
      </BodyText>
      {planLabel && (
        <Button variant="outline" style={{ marginTop: spacing.md }} onPress={() => router.push("/membership")}>
          View Membership
        </Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  planLabel: { fontSize: 15, fontWeight: "700", color: colors.primary, marginBottom: spacing.xs },
  count: { fontSize: 26, fontWeight: "800", color: colors.text },
  total: { fontSize: 14, fontWeight: "400" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#0001", overflow: "hidden", marginTop: spacing.sm },
  fill: { height: 8, borderRadius: 4 },
  note: { fontSize: 12, marginTop: spacing.xs },
});
