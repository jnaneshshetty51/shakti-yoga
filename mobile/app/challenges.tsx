import React, { useMemo, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AchievementModal } from "@/components/AchievementModal";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";
import type { ChallengeView } from "@/lib/types";

export default function ChallengesScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useResource(
    () => api.get<{ challenges: ChallengeView[] }>("/api/challenges"),
    [],
  );
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [celebrationBadges, setCelebrationBadges] = useState<{ title?: string; name?: string; description?: string }[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const join = async (c: ChallengeView) => {
    setJoiningId(c.id);
    try {
      await api.post(`/api/challenges/${c.id}/join`);
      setJoinedIds((prev) => new Set(prev).add(c.id));
      await reload();
      setCelebrationBadges([
        {
          title: "Challenge Accepted!",
          description: `You are now on the journey to complete "${c.title}". Keep the daily momentum alive!`,
        },
      ]);
      setShowCelebration(true);
    } catch (err) {
      Alert.alert(
        "Couldn't join",
        err instanceof ApiError ? err.message : "Please check your connection and try again.",
      );
    } finally {
      setJoiningId(null);
    }
  };

  const challenges = useMemo(() => {
    const list = data?.challenges ?? [];
    const isJoined = (c: ChallengeView) => c.joined || joinedIds.has(c.id);

    let filtered = list;
    if (filter === "active") {
      filtered = list.filter((c) => isJoined(c) && !c.completed);
    } else if (filter === "completed") {
      filtered = list.filter((c) => c.completed);
    }

    return [...filtered].sort((a, b) => Number(isJoined(b)) - Number(isJoined(a)));
  }, [data, joinedIds, filter]);

  const renderProgressRing = (progress: number, target: number) => {
    const ringRadius = 28;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * ringRadius;
    const pct = target > 0 ? Math.min(1, progress / target) : 0;
    const strokeDashoffset = circumference - pct * circumference;
    const percentInt = Math.round(pct * 100);

    return (
      <View style={styles.ringContainer}>
        <Svg width={68} height={68}>
          <Circle
            cx={34}
            cy={34}
            r={ringRadius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={34}
            cy={34}
            r={ringRadius}
            stroke={percentInt >= 100 ? colors.primary : colors.secondary}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform="rotate(-90 34 34)"
          />
        </Svg>
        <View style={styles.ringCenterText}>
          <BodyText style={styles.ringPercentText}>{percentInt}%</BodyText>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Challenges" />

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
        >
          <BodyText style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
            All
          </BodyText>
        </Pressable>

        <Pressable
          onPress={() => setFilter("active")}
          style={[styles.filterTab, filter === "active" && styles.filterTabActive]}
        >
          <BodyText style={[styles.filterTabText, filter === "active" && styles.filterTabTextActive]}>
            My Active
          </BodyText>
        </Pressable>

        <Pressable
          onPress={() => setFilter("completed")}
          style={[styles.filterTab, filter === "completed" && styles.filterTabActive]}
        >
          <BodyText style={[styles.filterTabText, filter === "completed" && styles.filterTabTextActive]}>
            Completed
          </BodyText>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load challenges" subtitle={error} onRetry={reload} />
      ) : challenges.length === 0 ? (
        <EmptyState
          title={filter === "active" ? "No active challenges" : "No challenges found"}
          subtitle={
            filter === "active"
              ? "Join an open challenge to track your milestones."
              : "Check back soon for the next studio challenge."
          }
        />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const joined = item.joined || joinedIds.has(item.id);
            const pct = item.goalTarget > 0 ? Math.min(1, item.progress / item.goalTarget) : 0;
            const percentInt = Math.round(pct * 100);

            return (
              <Card style={styles.challengeCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Heading size="sm">{item.title}</Heading>
                    {item.description ? (
                      <BodyText muted style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                      </BodyText>
                    ) : null}
                  </View>

                  {joined ? renderProgressRing(item.progress, item.goalTarget) : (
                    <Badge tone={item.completed ? "success" : "neutral"}>
                      {item.completed ? "Done" : `${item.daysLeft}d left`}
                    </Badge>
                  )}
                </View>

                {/* Progress Details if Joined */}
                {joined && (
                  <View style={styles.joinedSection}>
                    <View style={styles.progressRow}>
                      <BodyText style={styles.progressCounter}>
                        {item.progress} / {item.goalTarget} {item.goalLabel}
                      </BodyText>
                      {item.completed ? (
                        <Badge tone="success">Completed</Badge>
                      ) : (
                        <BodyText muted style={{ fontSize: 12 }}>
                          {item.daysLeft} {item.daysLeft === 1 ? "day" : "days"} left
                        </BodyText>
                      )}
                    </View>

                    {/* Progress Bar with Milestones */}
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
                    </View>

                    <View style={styles.milestonesRow}>
                      <BodyText muted style={[styles.milestoneText, percentInt >= 25 && styles.milestoneDone]}>
                        25%
                      </BodyText>
                      <BodyText muted style={[styles.milestoneText, percentInt >= 50 && styles.milestoneDone]}>
                        50%
                      </BodyText>
                      <BodyText muted style={[styles.milestoneText, percentInt >= 75 && styles.milestoneDone]}>
                        75%
                      </BodyText>
                      <BodyText muted style={[styles.milestoneText, percentInt >= 100 && styles.milestoneDone]}>
                        100%
                      </BodyText>
                    </View>
                  </View>
                )}

                {/* Footer Actions */}
                <View style={styles.footerRow}>
                  <View style={styles.participantCount}>
                    <Ionicons name="people-outline" size={16} color={colors.muted} />
                    <BodyText muted style={{ fontSize: 12 }}>
                      {item.participantCount} yogis participating
                    </BodyText>
                  </View>

                  {joined && !item.completed ? (
                    <Button
                      variant="primary"
                      onPress={() => router.push("/practices" as any)}
                    >
                      Practise Today
                    </Button>
                  ) : !joined ? (
                    <Button
                      variant="secondary"
                      loading={joiningId === item.id}
                      onPress={() => join(item)}
                    >
                      Join Challenge
                    </Button>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Achievement / Challenge Joined Celebratory Modal */}
      <AchievementModal
        visible={showCelebration}
        achievements={celebrationBadges}
        onClose={() => setShowCelebration(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterTabsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  challengeCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  ringContainer: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
  },
  ringPercentText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  joinedSection: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    padding: spacing.sm,
    borderRadius: radius.control,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressCounter: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  milestoneText: {
    fontSize: 10,
  },
  milestoneDone: {
    color: colors.secondary,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  participantCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
