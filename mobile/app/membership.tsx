import React, { useCallback, useState } from "react";
import { ScrollView, View, StyleSheet, Alert, Pressable } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Screen, BodyText, Card, Badge, Button, LoadingView, EmptyState, Heading } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError, getToken, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { formatPrice } from "@/lib/format";
import { spacing } from "@/theme";

interface Subscription {
  planType: string;
  planKey: string | null;
  interval: string;
  amount: number;
  currency: string;
  status: string;
  startDate: string;
  renewalDate: string;
  provider: string;
  store: string | null;
  recurring: boolean;
  pausedAt: string | null;
  currentCycleStart: string | null;
}
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "CREATED" | "PAID" | "FAILED" | "REFUNDED";
  createdAt: string;
}
interface BillingResponse {
  subscription: Subscription | null;
  payments: Payment[];
  credits: number;
}

const PLAN_LABEL: Record<string, string> = {
  EVERYDAY_YOGA: "Everyday Yoga",
  YOGA_THERAPY: "Yoga Therapy",
  STARTER: "Starter",
  FAMILY: "Family",
  TRIAL: "Free Trial",
};
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success", TRIAL: "warning", CANCELLED: "danger", EXPIRED: "danger", PAUSED: "warning",
};

export default function MembershipScreen() {
  const { data, loading, error, reload } = useResource(() => api.get<BillingResponse>("/api/billing"), []);
  const [busy, setBusy] = useState<string | null>(null);
  const sub = data?.subscription ?? null;
  const storeManaged = sub?.provider === "apple" || sub?.provider === "google";

  const act = useCallback(async (intent: "cancel" | "pause" | "downgrade") => {
    setBusy(intent);
    try {
      const res = await api.post<{ storeManaged?: boolean; manageUrl?: string; scheduled?: boolean; message?: string }>(
        "/api/billing/cancel",
        { intent },
      );
      if (res.storeManaged && res.manageUrl) {
        await WebBrowser.openBrowserAsync(res.manageUrl);
      } else {
        Alert.alert(intent === "downgrade" ? "Scheduled" : "Done", res.message ?? "Your membership was updated.");
        reload();
      }
    } catch (e) {
      Alert.alert("Couldn't update", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }, [reload]);

  const downloadReceipt = useCallback(async (paymentId: string) => {
    setBusy(`receipt-${paymentId}`);
    try {
      const token = await getToken();
      const dest = new File(Paths.cache, `shakti-invoice-${paymentId}.pdf`);
      const file = await File.downloadFileAsync(`${API_URL}/api/billing/invoice/${paymentId}?format=pdf`, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        idempotent: true,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        Alert.alert("Downloaded", "Saved to the app cache.");
      }
    } catch {
      Alert.alert("Couldn't get the receipt", "Please try again.");
    } finally {
      setBusy(null);
    }
  }, []);

  const confirm = (intent: "cancel" | "pause" | "downgrade", title: string, body: string) =>
    Alert.alert(title, body, [
      { text: "Not now", style: "cancel" },
      { text: "Continue", style: intent === "cancel" ? "destructive" : "default", onPress: () => act(intent) },
    ]);

  return (
    <Screen>
      <ScreenHeader title="Membership" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your membership" subtitle={error} />
      ) : !sub ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState title="No active plan" subtitle="Explore our programs to get started." />
          <Button style={{ marginTop: spacing.md }} onPress={() => router.push("/subscribe")}>See plans</Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.rowBetween}>
              <BodyText style={{ fontWeight: "700", fontSize: 17 }}>{PLAN_LABEL[sub.planType] ?? sub.planType}</BodyText>
              <Badge tone={STATUS_TONE[sub.status] ?? "neutral"}>{sub.status}</Badge>
            </View>
            <BodyText muted style={{ marginTop: spacing.sm }}>
              {sub.amount > 0 ? `${formatPrice(sub.amount, sub.currency)} / ${sub.interval === "annual" ? "year" : "month"}` : "No charge"}
            </BodyText>
            <BodyText muted>
              {sub.status === "PAUSED" ? "Paused · access until" : sub.recurring ? "Renews" : "Access until"}{" "}
              {new Date(sub.renewalDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </BodyText>
            {(data?.credits ?? 0) > 0 && <BodyText style={{ marginTop: spacing.sm }}>1:1 session credits: {data!.credits}</BodyText>}
          </Card>

          <Card style={{ marginBottom: spacing.md }}>
            <Heading size="sm" style={{ marginBottom: spacing.sm }}>Manage</Heading>
            {storeManaged ? (
              <>
                <BodyText muted style={{ marginBottom: spacing.sm }}>
                  Your subscription is billed by the {sub.store === "play_store" ? "Play Store" : "App Store"}.
                </BodyText>
                <Button variant="outline" loading={busy === "cancel"} onPress={() => act("cancel")}>
                  Manage in the {sub.store === "play_store" ? "Play Store" : "App Store"}
                </Button>
              </>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Button variant="secondary" onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/programs")}>
                  Change plan
                </Button>
                {sub.planType === "EVERYDAY_YOGA" && (
                  <Button variant="outline" loading={busy === "downgrade"}
                    onPress={() => confirm("downgrade", "Downgrade to Starter?", "Applies at your next renewal. You keep full access until then.")}>
                    Downgrade to Starter
                  </Button>
                )}
                {sub.status === "PAUSED" ? (
                  <Button variant="outline" onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/dashboard/billing")}>
                    Resume membership
                  </Button>
                ) : (
                  <Button variant="outline" loading={busy === "pause"}
                    onPress={() => confirm("pause", "Pause membership?", "Billing stops. Your access runs to the current renewal date; resume any time.")}>
                    Pause membership
                  </Button>
                )}
                <Button variant="ghost" loading={busy === "cancel"}
                  onPress={() => confirm("cancel", "Cancel membership?", `Access continues until ${new Date(sub.renewalDate).toLocaleDateString("en-IN")}. No refunds for the current cycle.`)}>
                  Cancel membership
                </Button>
              </View>
            )}
          </Card>

          {(data?.payments ?? []).length > 0 && (
            <Card>
              <Heading size="sm" style={{ marginBottom: spacing.sm }}>Payment history</Heading>
              {data!.payments.map((p) => (
                <View key={p.id} style={styles.payRow}>
                  <BodyText>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</BodyText>
                  <BodyText muted>{formatPrice(p.amount, p.currency)}</BodyText>
                  <Badge tone={p.status === "PAID" ? "success" : p.status === "FAILED" ? "danger" : "neutral"}>{p.status}</Badge>
                  {p.status === "PAID" ? (
                    <Pressable onPress={() => downloadReceipt(p.id)} disabled={busy === `receipt-${p.id}`} hitSlop={8}>
                      <BodyText style={{ color: "#4A6741", fontWeight: "600", fontSize: 13 }}>
                        {busy === `receipt-${p.id}` ? "…" : "Receipt"}
                      </BodyText>
                    </Pressable>
                  ) : (
                    <View style={{ width: 48 }} />
                  )}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  payRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs, gap: spacing.sm },
});
