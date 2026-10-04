import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  View,
  Image,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState, Button } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ReactionPills, ReactionPickerModal, type AllowedReaction } from "@/components/ReactionPicker";
import { PostComposerModal } from "@/components/PostComposerModal";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";

interface Post {
  id: string;
  body: string;
  imageUrl: string | null;
  author: string;
  authorId: string;
  avatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  mine: boolean;
  liked: boolean;
  userReaction: string | null;
  reactionCounts: Record<string, number>;
}

interface FeedResponse {
  posts: Post[];
  nextCursor: number | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommunityScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [composerVisible, setComposerVisible] = useState(false);
  const [pickerTargetPostId, setPickerTargetPostId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const fetchFeed = useCallback(async (reset = true) => {
    try {
      setError(null);
      const url = `/api/community/feed?cursor=0${filter === "mine" ? "&mine=true" : ""}`;
      const res = await api.get<FeedResponse>(url);
      setPosts(res.posts);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load community feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
  };

  const loadMore = async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = `/api/community/feed?cursor=${nextCursor}${filter === "mine" ? "&mine=true" : ""}`;
      const more = await api.get<FeedResponse>(url);
      setPosts((prev) => [...(prev ?? []), ...more.posts]);
      setNextCursor(more.nextCursor);
    } catch (err) {
      Alert.alert("Couldn't load more", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleReaction = async (post: Post, rx: AllowedReaction = "❤️") => {
    const isTogglingOff = post.userReaction === rx;
    const prevReaction = post.userReaction;
    const prevCounts = { ...(post.reactionCounts || {}) };
    const prevLikeCount = post.likeCount;

    // Optimistic update
    const newCounts = { ...prevCounts };
    if (prevReaction) {
      newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 1) - 1);
    }
    if (!isTogglingOff) {
      newCounts[rx] = (newCounts[rx] || 0) + 1;
    }

    const optimisticPost: Post = {
      ...post,
      userReaction: isTogglingOff ? null : rx,
      liked: !isTogglingOff,
      likeCount: isTogglingOff ? prevLikeCount - 1 : prevReaction ? prevLikeCount : prevLikeCount + 1,
      reactionCounts: newCounts,
    };

    setPosts((prev) => (prev ?? []).map((p) => (p.id === post.id ? optimisticPost : p)));

    try {
      const res = await api.post<{
        on: boolean;
        reaction: string | null;
        likeCount: number;
        reactionCounts: Record<string, number>;
      }>(`/api/community/posts/${post.id}/like`, { reaction: rx });

      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? {
                ...p,
                userReaction: res.reaction,
                liked: res.on,
                likeCount: res.likeCount,
                reactionCounts: res.reactionCounts,
              }
            : p,
        ),
      );
    } catch {
      // Revert on failure
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? {
                ...p,
                userReaction: prevReaction,
                liked: Boolean(prevReaction),
                likeCount: prevLikeCount,
                reactionCounts: prevCounts,
              }
            : p,
        ),
      );
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...(prev ?? [])]);
  };

  const handleReportPost = (postId: string) => {
    Alert.alert("Report Post", "Flag this post for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/community/posts/${postId}/report`, { reason: "Inappropriate" });
            Alert.alert("Reported", "Thank you. Our team will review this post.");
          } catch {
            Alert.alert("Error", "Could not submit report.");
          }
        },
      },
    ]);
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to remove your post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/api/community/posts/${postId}`);
            setPosts((prev) => (prev ?? []).filter((p) => p.id !== postId));
          } catch {
            Alert.alert("Error", "Could not delete post.");
          }
        },
      },
    ]);
  };

  const list = posts ?? [];
  const targetPost = pickerTargetPostId ? list.find((p) => p.id === pickerTargetPostId) : null;

  return (
    <Screen>
      <ScreenHeader
        title="Community"
        rightAction={
          <Pressable onPress={() => setComposerVisible(true)} hitSlop={8} style={styles.headerShareBtn}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
        >
          <BodyText style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
            All Yogis
          </BodyText>
        </Pressable>
        <Pressable
          onPress={() => setFilter("mine")}
          style={[styles.filterTab, filter === "mine" && styles.filterTabActive]}
        >
          <BodyText style={[styles.filterTabText, filter === "mine" && styles.filterTabTextActive]}>
            My Shares
          </BodyText>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load community feed" subtitle={error} onRetry={() => fetchFeed()} />
      ) : list.length === 0 ? (
        <EmptyState
          title={filter === "mine" ? "No shares yet" : "No posts yet"}
          subtitle={
            filter === "mine"
              ? "Your reflections and shares will appear here."
              : "Be the first to share an insight from your practice!"
          }
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListFooterComponent={
            nextCursor != null ? (
              <Button variant="outline" loading={loadingMore} onPress={loadMore} style={{ marginTop: spacing.sm }}>
                Load more
              </Button>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.postCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Pressable
                  onPress={() => setSelectedProfileId(item.authorId)}
                  style={styles.authorRow}
                >
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <BodyText style={{ color: colors.white, fontWeight: "700" }}>
                        {item.author.charAt(0).toUpperCase()}
                      </BodyText>
                    </View>
                  )}
                  <View>
                    <BodyText style={{ fontWeight: "700", fontSize: 14 }}>{item.author}</BodyText>
                    <BodyText muted style={{ fontSize: 12 }}>{timeAgo(item.createdAt)}</BodyText>
                  </View>
                </Pressable>

                <View style={styles.headerRightActions}>
                  {item.mine ? (
                    <Pressable onPress={() => handleDeletePost(item.id)} hitSlop={8} style={styles.menuIconBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => handleReportPost(item.id)} hitSlop={8} style={styles.menuIconBtn}>
                      <Ionicons name="flag-outline" size={15} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Body — image-only posts store a single-space placeholder server-side */}
              {item.body.trim() ? (
                <Pressable onPress={() => router.push(`/community/${item.id}` as any)}>
                  <BodyText style={styles.postBody}>{item.body}</BodyText>
                </Pressable>
              ) : null}

              {/* Image */}
              {item.imageUrl && (
                <Pressable onPress={() => router.push(`/community/${item.id}` as any)}>
                  <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
                </Pressable>
              )}

              {/* Actions Footer */}
              <View style={styles.actionsFooter}>
                <ReactionPills
                  reactions={item.reactionCounts}
                  userReaction={item.userReaction}
                  likeCount={item.likeCount}
                  onToggleReaction={(rx) => handleToggleReaction(item, rx)}
                  onOpenPicker={() => setPickerTargetPostId(item.id)}
                />

                <Pressable
                  onPress={() => router.push(`/community/${item.id}` as any)}
                  style={styles.commentAction}
                  hitSlop={6}
                >
                  <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
                  <BodyText muted style={{ fontSize: 13 }}>{item.commentCount}</BodyText>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}

      {/* Floating Action Button (Composer) */}
      <Pressable
        onPress={() => setComposerVisible(true)}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Create post"
      >
        <Ionicons name="add" size={24} color={colors.white} />
        <BodyText style={styles.fabText}>Share</BodyText>
      </Pressable>

      {/* Popovers / Modals */}
      <PostComposerModal
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onPostCreated={handlePostCreated}
      />

      <ReactionPickerModal
        visible={!!pickerTargetPostId}
        onClose={() => setPickerTargetPostId(null)}
        onSelect={(rx) => {
          if (targetPost) handleToggleReaction(targetPost, rx);
        }}
        currentReaction={targetPost?.userReaction}
      />

      <MemberProfileModal
        memberId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
        onSelectPost={(postId) => router.push(`/community/${postId}` as any)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerShareBtn: {
    padding: spacing.xs,
  },
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
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  postCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  menuIconBtn: {
    padding: 6,
  },
  postBody: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.control,
    marginTop: spacing.sm,
  },
  actionsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    ...shadows.card,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
