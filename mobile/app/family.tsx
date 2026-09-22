import React, { useState } from "react";
import { ScrollView, View, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Screen, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface FamilyView {
  isFamily: boolean;
  isOwner: boolean;
  code: string | null;
  seatsUsed: number;
  seatsTotal: number;
  members: { id?: string; name: string; owner: boolean }[];
  ownerName?: string;
}

export default function FamilyScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => (user ? api.get<FamilyView>("/api/family") : Promise.resolve(null)),
    [user]
  );
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await api.post("/api/family/join", { code: joinCode });
      setJoinCode("");
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

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      `Remove ${memberName}?`,
      "They will be removed from your family plan and revert to a free account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActionBusy(true);
            try {
              await api.post("/api/family/remove", { memberId });
              await reload();
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "Could not remove member.");
            } finally {
              setActionBusy(false);
            }
          },
        },
      ]
    );
  };

  const confirmLeaveFamily = () => {
    Alert.alert(
      "Leave family plan?",
      "You will lose access to classes on this plan and revert to a free account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Plan",
          style: "destructive",
          onPress: async () => {
            setActionBusy(true);
            try {
              await api.post("/api/family/leave", {});
              await reload();
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "Could not leave family plan.");
            } finally {
              setActionBusy(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Family Plan" />
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card>
            <BodyText muted style={{ marginBottom: spacing.md }}>
              Sign in or create an account to view your family plan or join one using an invite code.
            </BodyText>
            <Button onPress={() => router.push("/(auth)/welcome")}>Log in / Sign up</Button>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Family Plan" />
      {loading ? (
        <LoadingView />
      ) : error || !data ? (
        <EmptyState title="Couldn't load family plan" subtitle={error ?? undefined} onRetry={reload} />
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
                {data.seatsUsed >= data.seatsTotal ? (
                  <BodyText muted style={{ marginTop: spacing.md, fontSize: 13 }}>
                    All seats are taken. New members can join once a seat frees up.
                  </BodyText>
                ) : data.code ? (
                  <>
                    <BodyText muted style={{ marginTop: spacing.md }}>Invite code — share with household</BodyText>
                    <BodyText style={styles.code}>{data.code}</BodyText>
                    <Button variant="outline" onPress={copyCode}>{copied ? "Copied" : "Copy Code"}</Button>
                  </>
                ) : null}
              </Card>
              <Card>
                <BodyText style={{ fontWeight: "700", marginBottom: spacing.sm }}>Members</BodyText>
                {data.members.map((m, i) => (
                  <View key={m.id ?? i} style={styles.memberRow}>
                    <BodyText style={{ flex: 1 }}>{m.name}</BodyText>
                    {m.owner ? (
                      <Badge tone="success">Owner</Badge>
                    ) : (
                      m.id && (
                        <Pressable
                          onPress={() => confirmRemoveMember(m.id!, m.name)}
                          disabled={actionBusy}
                          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                          accessibilityLabel={`Remove ${m.name}`}
                        >
                          <BodyText style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>
                            Remove
                          </BodyText>
                        </Pressable>
                      )
                    )}
                  </View>
                ))}
              </Card>
            </>
          ) : (
            <Card>
              <View style={[styles.row, { marginBottom: spacing.xs }]}>
                <BodyText style={{ fontWeight: "700" }}>
                  You&rsquo;re on {data.ownerName}&rsquo;s family plan
                </BodyText>
                <Badge tone="neutral">Member</Badge>
              </View>
              <BodyText muted style={{ marginBottom: spacing.md }}>
                Your membership and daily classes are shared. Your personal Yoga Therapy records and notes stay private to you.
              </BodyText>

              {data.members.length > 0 && (
                <View style={{ marginBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
                  <BodyText style={{ fontWeight: "700", marginBottom: spacing.xs, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: colors.muted }}>
                    Family Members
                  </BodyText>
                  {data.members.map((m, i) => (
                    <View key={m.id ?? i} style={styles.memberRow}>
                      <BodyText style={{ flex: 1, fontSize: 14 }}>{m.name}</BodyText>
                      {m.owner && <Badge tone="neutral">Owner</Badge>}
                    </View>
                  ))}
                </View>
              )}

              <Button
                variant="outline"
                loading={actionBusy}
                onPress={confirmLeaveFamily}
                style={{ borderColor: colors.danger }}
              >
                <BodyText style={{ color: colors.danger, fontWeight: "600" }}>Leave Family Plan</BodyText>
              </Button>
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
