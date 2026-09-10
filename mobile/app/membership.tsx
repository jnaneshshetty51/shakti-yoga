import React from "react";
import { ScrollView } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen, BodyText, Card, Badge, LoadingView, EmptyState, Button } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { formatPrice } from "@/lib/format";
import { spacing } from "@/theme";

interface BillingResponse {
  subscription: {
    planType: string;
    amount: number;
    currency: string;
    status: string;
    startDate: string;
    renewalDate: string;
    recurring: boolean;
  } | null;
  credits: number;
}

const PLAN_LABEL: Record<string, string> = {
  EVERYDAY_YOGA: "Everyday Yoga",
  YOGA_THERAPY: "Yoga Therapy",
  TRIAL: "Free Trial",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  TRIAL: "warning",
  CANCELLED: "danger",
  EXPIRED: "danger",
  PAUSED: "warning",
};

export default function MembershipScreen() {
  const { data, loading, error } = useResource(() => api.get<BillingResponse>("/api/billing"), []);

  return (
    <Screen>
      <ScreenHeader title="Membership" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your membership" subtitle={error} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {data?.subscription ? (
            <Card>
              <BodyText style={{ fontWeight: "700", fontSize: 17 }}>
                {PLAN_LABEL[data.subscription.planType] ?? data.subscription.planType}
              </BodyText>
              <Badge tone={STATUS_TONE[data.subscription.status] ?? "neutral"}>{data.subscription.status}</Badge>
              <BodyText muted style={{ marginTop: spacing.sm }}>
                {data.subscription.amount > 0 ? `${formatPrice(data.subscription.amount, data.subscription.currency)} / month` : "No charge"}
              </BodyText>
              <BodyText muted>
                {data.subscription.recurring ? "Renews" : "Access until"} {new Date(data.subscription.renewalDate).toLocaleDateString()}
              </BodyText>
              {data.credits > 0 && (
                <BodyText style={{ marginTop: spacing.sm }}>1:1 session credits: {data.credits}</BodyText>
              )}
              <Button
                variant="secondary"
                style={{ marginTop: spacing.md }}
                onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/programs")}
              >
                Change Plan
              </Button>
            </Card>
          ) : (
            <EmptyState title="No active plan" subtitle="Explore our programs to get started." />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
