import React, { useEffect, useState } from "react";
import { Modal, View, Image, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Badge, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";

interface MemberStats {
  totalClasses: number;
  currentStreak: number;
  totalPosts: number;
}

interface MemberRecentPost {
  id: string;
  body: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface MemberData {
  id: string;
  name: string;
  avatarUrl: string | null;
  tier: string;
  memberSince: string;
  stats: MemberStats;
  recentPosts: MemberRecentPost[];
}

interface MemberProfileModalProps {
  memberId: string | null;
  onClose: () => void;
  onSelectPost?: (postId: string) => void;
}

export function MemberProfileModal({ memberId, onClose, onSelectPost }: MemberProfileModalProps) {
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setData(null);
      return;
    }
    let isCurrent = true;
    setLoading(true);
    setError(null);
    api
      .get<{ member: MemberData }>(`/api/community/members/${memberId}`)
      .then((res) => {
        if (isCurrent) setData(res.member);
      })
      .catch((err) => {
        if (isCurrent) setError(err?.message || "Failed to load member profile.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [memberId]);

  if (!memberId) return null;

  return (
    <Modal visible={!!memberId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerBar}>
            <View style={styles.dragIndicator} />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <BodyText muted style={{ marginTop: spacing.sm }}>Loading profile...</BodyText>
            </View>
          ) : error || !data ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
              <BodyText style={{ marginTop: spacing.sm, textAlign: "center" }}>{error || "Could not load profile"}</BodyText>
              <Pressable onPress={onClose} style={styles.retryBtn}>
                <BodyText style={{ color: colors.white, fontWeight: "600" }}>Dismiss</BodyText>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Profile Card Header */}
              <View style={styles.profileHeader}>
                {data.avatarUrl ? (
                  <Image source={{ uri: data.avatarUrl }} style={styles.largeAvatar} />
                ) : (
                  <View style={[styles.largeAvatar, styles.avatarPlaceholder]}>
                    <Heading size="lg" style={{ color: colors.white }}>
                      {data.name.charAt(0).toUpperCase()}
                    </Heading>
                  </View>
                )}
                <Heading size="md" style={{ marginTop: spacing.sm }}>{data.name}</Heading>
                <View style={styles.badgeRow}>
                  <Badge tone="warning">{data.tier}</Badge>
                </View>
                <BodyText muted style={{ fontSize: 13, marginTop: 4 }}>
                  Member since {new Date(data.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </BodyText>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Ionicons name="flame" size={20} color={colors.secondary} />
                  <Heading size="sm" style={styles.statVal}>{data.stats.currentStreak}</Heading>
                  <BodyText muted style={styles.statLabel}>Day Streak</BodyText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Ionicons name="body-outline" size={20} color={colors.primary} />
                  <Heading size="sm" style={styles.statVal}>{data.stats.totalClasses}</Heading>
                  <BodyText muted style={styles.statLabel}>Classes</BodyText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.sageText} />
                  <Heading size="sm" style={styles.statVal}>{data.stats.totalPosts}</Heading>
                  <BodyText muted style={styles.statLabel}>Shares</BodyText>
                </View>
              </View>

              {/* Recent Posts Section */}
              <View style={styles.postsSection}>
                <Heading size="sm" style={{ marginBottom: spacing.sm }}>Recent Shares</Heading>
                {data.recentPosts.length === 0 ? (
                  <BodyText muted style={{ fontStyle: "italic" }}>No shares yet.</BodyText>
                ) : (
                  data.recentPosts.map((post) => (
                    <Pressable
                      key={post.id}
                      onPress={() => {
                        onClose();
                        onSelectPost?.(post.id);
                      }}
                      style={styles.postItem}
                    >
                      <Card style={styles.postCard}>
                        <BodyText numberOfLines={3} style={{ fontSize: 14 }}>{post.body}</BodyText>
                        {post.imageUrl && (
                          <Image source={{ uri: post.imageUrl }} style={styles.postThumb} />
                        )}
                        <View style={styles.postMeta}>
                          <View style={styles.metaItem}>
                            <Ionicons name="heart" size={13} color={colors.danger} />
                            <BodyText muted style={{ fontSize: 12 }}>{post.likeCount}</BodyText>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="chatbubble" size={12} color={colors.muted} />
                            <BodyText muted style={{ fontSize: 12 }}>{post.commentCount}</BodyText>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: spacing.xl,
    ...shadows.card,
  },
  headerBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    position: "relative",
  },
  dragIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  closeBtn: {
    position: "absolute",
    right: spacing.md,
    top: spacing.sm,
    padding: spacing.xs,
  },
  centerContainer: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.secondaryLight,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statVal: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  postsSection: {
    marginTop: spacing.xl,
  },
  postItem: {
    marginBottom: spacing.sm,
  },
  postCard: {
    padding: spacing.md,
  },
  postThumb: {
    width: "100%",
    height: 110,
    borderRadius: radius.control,
    marginTop: spacing.sm,
  },
  postMeta: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
