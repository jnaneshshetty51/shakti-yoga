import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, TextInput, Pressable, Share, StyleSheet, ActivityIndicator, Image, useWindowDimensions } from "react-native";
import { useLocalSearchParams, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { mediaUri } from "@/lib/media";
import { runCta, ctaLabel } from "@/lib/contentCta";
import { toParagraphs } from "@/lib/text";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem, ContentComment, ContentDetailResponse } from "@/lib/types";

const KIND_TITLE: Record<FeedItem["kind"], string> = {
  video: "Video",
  audio: "Audio",
  article: "Article",
  founder_message: "From Acharya Swastik",
  announcement: "Announcement",
};

/** Native self-hosted player, used for both video and audio-only sources — expo-video's VideoView renders a controls-only surface when there's no visual track, which is a fine minimal audio player and avoids pulling in a second media library. */
function InlineMediaPlayer({ uri }: { uri: string }) {
  const { width } = useWindowDimensions();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  return (
    <VideoView
      player={player}
      style={{
        width: width - spacing.lg * 2,
        height: 320,
        borderRadius: radius.control,
        marginTop: spacing.md,
        backgroundColor: colors.border,
      }}
      nativeControls
    />
  );
}

/** Hero image + any extra carousel images. */
function ContentImages({ item }: { item: FeedItem }) {
  const { width } = useWindowDimensions();
  const primary = mediaUri(item.imageUrl);
  const extra = item.mediaUrls.map((u) => mediaUri(u)).filter(Boolean) as string[];
  const gallery = [primary, ...extra].filter(Boolean) as string[];
  if (gallery.length === 0) return null;

  const w = width - spacing.lg * 2;
  if (gallery.length === 1) {
    return <Image source={{ uri: gallery[0] }} style={[styles.hero, { width: w }]} resizeMode="cover" />;
  }
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: spacing.md }}
    >
      {gallery.map((uri, i) => (
        <Image key={i} source={{ uri }} style={[styles.hero, { width: w, marginTop: 0, marginRight: i === gallery.length - 1 ? 0 : spacing.sm }]} resizeMode="cover" />
      ))}
    </ScrollView>
  );
}

/** Free-preview card for gated content the caller doesn't have access to — mirrors the website's /content/:id acquisition card. */
function LockedPreview({ preview }: { preview: Extract<ContentDetailResponse, { locked: true }>["preview"] }) {
  const thumb = mediaUri(preview.imageUrl);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {thumb ? <Image source={{ uri: thumb }} style={[styles.hero, { width: "100%" }]} resizeMode="cover" /> : null}
      <Heading size="lg" style={{ marginTop: spacing.md }}>{preview.title}</Heading>
      {(preview.excerpt || preview.caption) && (
        <BodyText muted style={{ marginTop: spacing.sm }}>{preview.excerpt ?? preview.caption}</BodyText>
      )}
      <Card style={{ marginTop: spacing.lg, alignItems: "center" }}>
        <Ionicons name="lock-closed-outline" size={22} color={colors.muted} style={{ marginBottom: spacing.sm }} />
        <BodyText muted style={{ textAlign: "center", marginBottom: spacing.md }}>
          This is available to Shakti members.
        </BodyText>
        <Link href="/subscribe" asChild>
          <Button>See membership plans</Button>
        </Link>
      </Card>
    </ScrollView>
  );
}

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useResource(
    () => api.get<ContentDetailResponse>(`/api/content/${id}`),
    [id],
  );

  useEffect(() => {
    api.post(`/api/content/${id}/view`).catch(() => {});
  }, [id]);

  const item = data && !data.locked ? data.item : null;

  return (
    <Screen>
      <ScreenHeader title={item ? KIND_TITLE[item.kind] : "Content"} />
      {loading ? (
        <LoadingView />
      ) : error || !data ? (
        <EmptyState title="Not found" subtitle={error ?? undefined} />
      ) : data.locked ? (
        <LockedPreview preview={data.preview} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Badge tone={item!.kind === "announcement" ? "warning" : "neutral"}>
            {(item!.kind === "article" || item!.kind === "founder_message") && item!.readMinutes
              ? `${item!.readMinutes} min read`
              : KIND_TITLE[item!.kind]}
          </Badge>
          <Heading size="lg" style={{ marginTop: spacing.sm }}>{item!.title}</Heading>
          <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }}>
            {item!.author}
            {item!.publishedAt ? ` · ${new Date(item!.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </BodyText>

          {item!.videoUrl ? (
            <InlineMediaPlayer uri={mediaUri(item!.videoUrl)!} />
          ) : item!.audioUrl ? (
            <InlineMediaPlayer uri={mediaUri(item!.audioUrl)!} />
          ) : (
            <ContentImages item={item!} />
          )}

          {(item!.kind === "video" || item!.kind === "audio") && item!.caption && (
            <BodyText style={{ marginTop: spacing.md }}>{item!.caption}</BodyText>
          )}
          {item!.instagramUrl && (
            <Button variant={item!.videoUrl ? "outline" : "primary"} style={{ marginTop: spacing.md }} onPress={() => WebBrowser.openBrowserAsync(item!.instagramUrl!)}>
              View on Instagram
            </Button>
          )}

          {item!.kind === "announcement" && item!.body && (
            <BodyText style={{ marginTop: spacing.md }}>{item!.body}</BodyText>
          )}

          {(item!.kind === "article" || item!.kind === "founder_message") && (
            <View style={{ marginTop: spacing.md }}>
              {item!.body ? (
                toParagraphs(item!.body).map((para, i) => (
                  <BodyText key={i} style={{ fontSize: 15, lineHeight: 23, marginTop: i === 0 ? 0 : spacing.md }}>{para}</BodyText>
                ))
              ) : item!.excerpt ? (
                <BodyText style={{ fontSize: 15, lineHeight: 23 }}>{item!.excerpt}</BodyText>
              ) : null}
              {item!.kind === "article" && item!.slug && (
                <Button
                  variant="outline"
                  style={{ marginTop: spacing.lg }}
                  onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/blog/${item!.slug}`)}
                >
                  Read on shaktiyoga.in
                </Button>
              )}
            </View>
          )}

          {item!.relatedClass && (
            <Card style={{ marginTop: spacing.lg }}>
              <BodyText muted style={{ fontSize: 12 }}>Pairs with</BodyText>
              <BodyText style={{ fontWeight: "700", marginTop: 2 }}>{item!.relatedClass.name}</BodyText>
            </Card>
          )}

          {item!.cta.type !== "none" && (
            <Button variant="secondary" style={{ marginTop: spacing.lg }} onPress={() => runCta(item!.cta)}>
              {ctaLabel(item!.cta)}
            </Button>
          )}

          <Interactions item={item!} contentId={String(id)} />
        </ScrollView>
      )}
    </Screen>
  );
}

function Interactions({ item, contentId }: { item: FeedItem; contentId: string }) {
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [saved, setSaved] = useState(item.saved);

  const toggle = async (kind: "like" | "save") => {
    const on = kind === "like" ? liked : saved;
    if (kind === "like") { setLiked(!on); setLikeCount((c) => c + (on ? -1 : 1)); }
    else setSaved(!on);
    try {
      const path = `/api/content/${contentId}/${kind}`;
      const res = on
        ? await api.del<{ likeCount: number; saveCount: number }>(path)
        : await api.post<{ likeCount: number; saveCount: number }>(path);
      setLikeCount(res.likeCount);
    } catch {
      // revert
      if (kind === "like") { setLiked(on); setLikeCount((c) => c + (on ? 1 : -1)); }
      else setSaved(on);
    }
  };

  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => toggle("like")}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={liked ? "Unlike" : "Like"}
          accessibilityState={{ selected: liked }}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? colors.danger : colors.muted} />
          <BodyText muted>{likeCount}</BodyText>
        </Pressable>
        <Pressable
          onPress={() => toggle("save")}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save"}
          accessibilityState={{ selected: saved }}
        >
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? colors.primary : colors.muted} />
        </Pressable>
        <Pressable
          onPress={() => Share.share({ message: `${item.title} — shaktiyoga.in`, url: `${API_URL}/content/${contentId}` })}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <Comments contentId={contentId} />
    </View>
  );
}

function Comments({ contentId }: { contentId: string }) {
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (next: number, replace: boolean) => {
    try {
      const res = await api.get<{ comments: ContentComment[]; nextCursor: number | null }>(
        `/api/content/${contentId}/comments?cursor=${next}`,
      );
      setComments((prev) => (replace ? res.comments : [...prev, ...res.comments]));
      setCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => { load(0, true); }, [load]);

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const res = await api.post<{ comment: ContentComment }>(`/api/content/${contentId}/comments`, { body: draft.trim() });
      setComments((prev) => [res.comment, ...prev]);
      setDraft("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setDraft(draft); // keep text
    } finally {
      setBusy(false);
    }
  };

  const report = async (commentId: string) => {
    await api.post(`/api/content/${contentId}/comments/${commentId}/report`, {}).catch(() => {});
  };

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Heading size="sm" style={{ marginBottom: spacing.sm }}>Comments</Heading>
      <View style={styles.composeRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a question or share a thought…"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Button loading={busy} disabled={!draft.trim()} onPress={send}>Post</Button>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : (
        comments.map((c) => (
          <Card key={c.id} style={{ marginTop: spacing.sm }}>
            <View style={styles.actionRow}>
              <BodyText style={{ fontWeight: "700", flex: 1 }}>{c.author}</BodyText>
              {!c.mine && (
                <Pressable onPress={() => report(c.id)} hitSlop={8}>
                  <Ionicons name="flag-outline" size={14} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <BodyText style={{ marginTop: 2 }}>{c.body}</BodyText>
          </Card>
        ))
      )}
      {cursor != null && !loading && (
        <Pressable onPress={() => load(cursor, false)} style={{ paddingVertical: spacing.md }}>
          <BodyText muted style={{ textAlign: "center" }}>Load more</BodyText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, borderRadius: radius.control, marginTop: spacing.md, backgroundColor: colors.border },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  composeRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 40,
  },
});
