import React, { useState } from "react";
import { ScrollView, View, TextInput, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Screen, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface FamilyView {
  isFamily: boolean;
  isOwner: boolean;
  code: string | null;
  seatsUsed: number;
  seatsTotal: number;
  members: { name: string; owner: boolean }[];
  ownerName?: string;
}

export default function FamilyScreen() {
  const { data, loading, error, reload } = useResource(() => api.get<FamilyView>("/api/family"), []);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await api.post("/api/family/join", { code: joinCode });
      await reload();
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Could not join");
    } finally {
      setJoining(false);
    }
  };

  const copyCode = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      <ScreenHeader title="Family" />
      {loading ? (
        <LoadingView />
      ) : error || !data ? (
        <EmptyState title="Couldn't load family plan" subtitle={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {!data.isFamily ? (
            <Card>
              <BodyText muted style={{ marginBottom: spacing.md }}>
                You&rsquo;re not on a Family plan yet. Have an invite code from a family member?
              </BodyText>
              <TextInput
                style={styles.input}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={6}
              />
              {joinError && <BodyText style={{ color: colors.danger, marginTop: spacing.xs }}>{joinError}</BodyText>}
              <Button style={{ marginTop: spacing.sm }} loading={joining} disabled={joinCode.length !== 6} onPress={join}>
                Join Family Plan
              </Button>
            </Card>
          ) : data.isOwner ? (
            <>
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  <BodyText style={{ fontWeight: "700" }}>{data.seatsUsed} / {data.seatsTotal} seats used</BodyText>
                  <Badge tone="success">Owner</Badge>
                </View>
                {data.code && (
                  <>
                    <BodyText muted style={{ marginTop: spacing.md }}>Invite code</BodyText>
                    <BodyText style={styles.code}>{data.code}</BodyText>
                    <Button variant="outline" onPress={copyCode}>{copied ? "Copied" : "Copy Code"}</Button>
                  </>
                )}
              </Card>
              <Card>
                {data.members.map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <BodyText>{m.name}</BodyText>
                    {m.owner && <Badge>Owner</Badge>}
                  </View>
                ))}
              </Card>
            </>
          ) : (
            <Card>
              <BodyText style={{ fontWeight: "700", marginBottom: spacing.xs }}>
                You&rsquo;re on {data.ownerName}&rsquo;s family plan
              </BodyText>
              <BodyText muted>
                Your membership and payments are managed with theirs. Your own Yoga Therapy details and progress stay private to you.
              </BodyText>
            </Card>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.white,
  },
  code: { fontSize: 26, fontWeight: "800", letterSpacing: 2, marginVertical: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  memberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
});
