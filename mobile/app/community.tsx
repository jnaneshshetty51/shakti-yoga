import React, { useState } from "react";
import { FlatList, View, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState, Button } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface Post {
  id: string;
  body: string;
  imageUrl: string | null;
  author: string;
  avatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  liked: boolean;
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

/**
 * Read-only view of the web/member community wall (likes only, no posting or
 * commenting from here yet) — previously the app had no way to see this feed
 * at all; the home screen's "Community" card only opened an external WhatsApp
 * link, which is a different feature (the WhatsApp groups, not this feed).
 */
export default function CommunityScreen() {
  const { data, loading, error } = useResource(() => api.get<FeedResponse>("/api/community/feed"), []);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const list = posts ?? data?.posts ?? [];
  if (posts === null && data) {
    setPosts(data.posts);
    setNextCursor(data.nextCursor);
  }

  const toggleLike = async (post: Post) => {
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p,
      ),
    );
    try {
      const res = post.liked
        ? await api.del<{ likeCount: number }>(`/api/community/posts/${post.id}/like`)
        : await api.post<{ likeCount: number }>(`/api/community/posts/${post.id}/like`);
      setPosts((prev) => (prev ?? []).map((p) => (p.id === post.id ? { ...p, likeCount: res.likeCount } : p)));
    } catch {
      // revert on failure
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id ? { ...p, liked: post.liked, likeCount: post.likeCount } : p,
        ),
      );
    }
  };

  const loadMore = async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await api.get<FeedResponse>(`/api/community/feed?cursor=${nextCursor}`);
      setPosts((prev) => [...(prev ?? []), ...more.posts]);
      setNextCursor(more.nextCursor);
    } catch (err) {
      // A failed "load more" shouldn't lose what's already on screen — the
      // user can just try the button again.
      void (err instanceof ApiError ? err.message : null);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Community" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load the community feed" subtitle={error} />
      ) : list.length === 0 ? (
        <EmptyState title="No posts yet" subtitle="Member posts will show up here." />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListFooterComponent={
            nextCursor != null ? (
              <Button variant="outline" loading={loadingMore} onPress={loadMore} style={{ marginTop: spacing.sm }}>
                Load more
              </Button>
            ) : null
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.header}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <BodyText style={{ color: colors.white, fontWeight: "700" }}>{item.author.charAt(0).toUpperCase()}</BodyText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <BodyText style={{ fontWeight: "700" }}>{item.author}</BodyText>
                  <BodyText muted style={{ fontSize: 12 }}>{timeAgo(item.createdAt)}</BodyText>
                </View>
              </View>
              <BodyText style={{ marginTop: spacing.sm }}>{item.body}</BodyText>
              {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.postImage} />}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => toggleLike(item)}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel={item.liked ? "Unlike" : "Like"}
                  accessibilityState={{ selected: item.liked }}
                >
                  <Ionicons name={item.liked ? "heart" : "heart-outline"} size={18} color={item.liked ? colors.danger : colors.muted} />
                  <BodyText muted style={{ fontSize: 13 }}>{item.likeCount}</BodyText>
                </Pressable>
                <View style={styles.action}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.muted} />
                  <BodyText muted style={{ fontSize: 13 }}>{item.commentCount}</BodyText>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  postImage: { width: "100%", height: 180, borderRadius: radius.control, marginTop: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
});
