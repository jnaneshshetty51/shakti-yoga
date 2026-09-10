import React, { useState } from "react";
import { ScrollView, View, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Screen, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

interface ReferralRow {
  id: string;
  refereeName: string;
  status: "PENDING" | "SUCCESSFUL" | "EXPIRED" | "REVERSED";
  rewardAmount: number;
}

interface ReferralStats {
  code: string;
  link: string;
  message: string;
  creditBalance: number;
  referrerReward: number;
  refereeDiscount: number;
  referrals: ReferralRow[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const STATUS_LABEL: Record<ReferralRow["status"], string> = {
  PENDING: "Pending",
  SUCCESSFUL: "Successful",
  EXPIRED: "Expired",
  REVERSED: "Reversed",
};

export default function ReferScreen() {
  const { data, loading, error } = useResource(() => api.get<ReferralStats>("/api/referral"), []);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      <ScreenHeader title="Refer & Earn" />
      {loading ? (
        <LoadingView />
      ) : error || !data ? (
        <EmptyState title="Couldn't load your referral code" subtitle={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card style={{ marginBottom: spacing.md }}>
            <BodyText muted>Your Shakti credit</BodyText>
            <BodyText style={styles.balance}>{inr(data.creditBalance)}</BodyText>
            <BodyText muted style={{ fontSize: 12 }}>Applied automatically at your next membership payment.</BodyText>
          </Card>

          <Card style={{ marginBottom: spacing.md }}>
            <BodyText muted>Your referral code</BodyText>
            <BodyText style={styles.code}>{data.code}</BodyText>
            <BodyText muted style={{ fontSize: 12 }}>
              They get {inr(data.refereeDiscount)} off their first membership · you get {inr(data.referrerReward)} credit.
            </BodyText>
            <View style={styles.actions}>
              <Button variant="outline" onPress={copy} style={{ flex: 1 }}>{copied ? "Copied" : "Copy Link"}</Button>
              <Button onPress={() => Share.share({ message: data.message })} style={{ flex: 1 }}>Share</Button>
            </View>
          </Card>

          <BodyText style={{ fontWeight: "700", marginBottom: spacing.sm }}>Your referrals</BodyText>
          {data.referrals.length === 0 ? (
            <BodyText muted>No referrals yet — share your code to get started.</BodyText>
          ) : (
            data.referrals.map((r) => (
              <Card key={r.id} style={styles.referralRow}>
                <BodyText style={{ flex: 1 }}>{r.refereeName}</BodyText>
                <BodyText muted>{STATUS_LABEL[r.status]}</BodyText>
                <BodyText style={{ fontWeight: "700", width: 64, textAlign: "right" }}>
                  {r.status === "SUCCESSFUL" ? inr(r.rewardAmount) : "—"}
                </BodyText>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 28, fontWeight: "800", marginVertical: spacing.xs },
  code: { fontSize: 28, fontWeight: "800", marginVertical: spacing.xs, letterSpacing: 1 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  referralRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
});
