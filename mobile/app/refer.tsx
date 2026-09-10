import React, { useState } from "react";
import { ScrollView, View, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Screen, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

interface ReferralStats {
  code: string;
  link: string;
  message: string;
  invited: number;
  converted: number;
  creditDays: number;
}

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
            <BodyText muted>Your referral code</BodyText>
            <BodyText style={styles.code}>{data.code}</BodyText>
            <View style={styles.actions}>
              <Button variant="outline" onPress={copy} style={{ flex: 1 }}>{copied ? "Copied" : "Copy Link"}</Button>
              <Button onPress={() => Share.share({ message: data.message })} style={{ flex: 1 }}>Share</Button>
            </View>
          </Card>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <BodyText muted>Invited</BodyText>
              <BodyText style={styles.statValue}>{data.invited}</BodyText>
            </Card>
            <Card style={styles.statCard}>
              <BodyText muted>Converted</BodyText>
              <BodyText style={styles.statValue}>{data.converted}</BodyText>
            </Card>
            <Card style={styles.statCard}>
              <BodyText muted>Credit</BodyText>
              <BodyText style={styles.statValue}>{data.creditDays}d</BodyText>
            </Card>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 28, fontWeight: "800", marginVertical: spacing.xs, letterSpacing: 1 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: spacing.xs },
});
