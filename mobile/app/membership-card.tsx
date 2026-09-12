import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, Heading, BodyText, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface BillingResponse {
  subscription: { planType: string; status: string; renewalDate: string; currentCycleStart: string | null } | null;
}

const PLAN_LABEL: Record<string, string> = {
  EVERYDAY_YOGA: "Everyday Yoga",
  YOGA_THERAPY: "Yoga Therapy",
  STARTER: "Starter",
  FAMILY: "Family",
  TRIAL: "Free Trial",
};

export default function MembershipCardScreen() {
  const { user } = useAuth();
  const { data, loading, error } = useResource(() => api.get<BillingResponse>("/api/billing"), []);
  const sub = data?.subscription;

  return (
    <Screen>
      <ScreenHeader title="Membership Card" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your card" subtitle={error} />
      ) : (
        <View style={{ padding: spacing.lg }}>
          <View style={styles.card}>
            <BodyText style={styles.brand}>SHAKTI YOGA KENDRA</BodyText>
            <Heading size="md" style={{ color: colors.white, marginTop: spacing.sm }}>{user?.name}</Heading>
            <BodyText style={{ color: colors.white + "CC", marginTop: 2 }}>
              {sub ? PLAN_LABEL[sub.planType] ?? sub.planType : "Guest"}
              {sub ? ` · ${sub.status}` : ""}
            </BodyText>

            {sub && (
              <View style={styles.footer}>
                <View>
                  <BodyText style={styles.metaLabel}>Status</BodyText>
                  <BodyText style={styles.metaValue}>{sub.status}</BodyText>
                </View>
                <View>
                  <BodyText style={styles.metaLabel}>Cycle ends</BodyText>
                  <BodyText style={styles.metaValue}>
                    {new Date(sub.renewalDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </BodyText>
                </View>
              </View>
            )}
          </View>
          <BodyText muted style={{ textAlign: "center", marginTop: spacing.md, fontSize: 12 }}>
            Your membership at a glance. Class check-in happens from the Classes tab.
          </BodyText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
  },
  brand: { color: colors.white + "CC", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: spacing.lg },
  metaLabel: { color: colors.white + "99", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { color: colors.white, fontWeight: "700" },
});
