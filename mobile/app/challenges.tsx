import React, { useMemo, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";
import type { ChallengeView } from "@/lib/types";

export default function ChallengesScreen() {
  const { data, loading, error, reload } = useResource(
    () => api.get<{ challenges: ChallengeView[] }>("/api/challenges"),
    [],
  );
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const join = async (id: string) => {
    setJoiningId(id);
    try {
      await api.post(`/api/challenges/${id}/join`);
      setJoinedIds((prev) => new Set(prev).add(id));
      await reload();
    } catch {
      /* ignore */
    } finally {
      setJoiningId(null);
    }
  };

  const challenges = useMemo(() => {
    const isJoined = (c: ChallengeView) => c.joined || joinedIds.has(c.id);
    return [...(data?.challenges ?? [])].sort((a, b) => Number(isJoined(b)) - Number(isJoined(a)));
  }, [data, joinedIds]);

  return (
    <Screen>
      <ScreenHeader title="Challenges" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load challenges" subtitle={error} />
      ) : challenges.length === 0 ? (
        <EmptyState title="No challenges right now" subtitle="Check back soon for the next one." />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const joined = item.joined || joinedIds.has(item.id);
            const pct = item.goalTarget > 0 ? Math.min(1, item.progress / item.goalTarget) : 0;
            return (
              <Card>
                <View style={styles.top}>
                  <Heading size="sm" style={{ flex: 1 }}>{item.title}</Heading>
                  {item.completed ? (
                    <Badge tone="success">Done</Badge>
                  ) : (
                    <Badge>{item.daysLeft} {item.daysLeft === 1 ? "day" : "days"} left</Badge>
                  )}
                </View>
                {item.description && (
                  <BodyText muted style={{ marginTop: spacing.xs }}>{item.description}</BodyText>
                )}
                <BodyText muted style={{ marginTop: spacing.sm, fontSize: 13 }}>
                  Goal: {item.goalTarget} {item.goalLabel} · {item.participantCount} joined
                </BodyText>
                {joined && (
                  <>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
                    </View>
                    <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }}>
                      {item.progress} / {item.goalTarget} {item.goalLabel}
                    </BodyText>
                  </>
                )}
                {!joined && (
                  <Button
                    style={{ marginTop: spacing.md }}
                    loading={joiningId === item.id}
                    onPress={() => join(item.id)}
                  >
                    Join Challenge
                  </Button>
                )}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
});
