import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BodyText, Card, Badge } from "@/components/ui";
import { colors, spacing } from "@/theme";

export interface PlanRung {
  key: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  recommended: boolean;
}

function money(amount: number, currency: string) {
  if (amount <= 0) return "Free";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${sym}${amount.toLocaleString()}`;
}

export function PlanList({ plans }: { plans: PlanRung[] }) {
  return (
    <View style={{ gap: spacing.md }}>
      {plans.map((p) => (
        <Card key={p.key} style={p.recommended ? styles.recommended : undefined}>
          <View style={styles.top}>
            <BodyText style={{ fontWeight: "700", fontSize: 16 }}>{p.name}</BodyText>
            {p.recommended && <Badge tone="success">Popular</Badge>}
          </View>
          <BodyText style={{ fontWeight: "800", fontSize: 20, marginTop: spacing.xs }}>
            {money(p.price, p.currency)}
            <BodyText muted style={{ fontSize: 13, fontWeight: "400" }}> / {p.period}</BodyText>
          </BodyText>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {p.features.map((f) => (
              <View key={f} style={styles.feature}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
                <BodyText style={{ flex: 1 }}>{f}</BodyText>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recommended: { borderColor: colors.primary, borderWidth: 1.5 },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
