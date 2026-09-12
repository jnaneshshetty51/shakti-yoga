import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText, Card, Badge } from "@/components/ui";
import { mediaUri } from "@/lib/media";
import { colors, spacing, radius, shadows } from "@/theme";
import type { FeedItem } from "@/lib/types";

const META: Record<FeedItem["kind"], string> = {
  reel: "Video Reel",
  post: "Reflection",
  announcement: "Announcement",
  blog: "Article",
};

export function FeedCard({ item }: { item: FeedItem }) {
  const meta = item.kind === "blog" ? `${item.readMinutes} min read` : META[item.kind];
  const preview =
    item.kind === "blog" ? item.excerpt : item.kind === "reel" ? item.caption : item.body;
  const thumb = mediaUri(item.imageUrl);

  return (
    <Pressable onPress={() => router.push(`/content/${item.id}`)}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.top}>
              <Badge tone={item.kind === "announcement" ? "warning" : "neutral"}>{meta}</Badge>
              {item.pinned && <Ionicons name="pin" size={14} color={colors.secondary} />}
            </View>
            <BodyText style={styles.title}>{item.title}</BodyText>
            {preview ? (
              <BodyText muted style={styles.preview} numberOfLines={2}>
                {preview}
              </BodyText>
            ) : null}
            <View style={styles.footerRow}>
              <BodyText muted style={styles.author}>
                {item.author}
              </BodyText>
              {item.kind !== "blog" && item.likeCount > 0 ? (
                <View style={styles.likes}>
                  <Ionicons name="heart" size={12} color={colors.secondary} />
                  <BodyText muted style={styles.likesText}>
                    {item.likeCount}
                  </BodyText>
                </View>
              ) : null}
            </View>
          </View>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons
                name={item.kind === "reel" ? "videocam-outline" : "book-outline"}
                size={22}
                color={colors.muted}
              />
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

/** Luxury fixed-width variant for horizontal rails (Home discovery strips). */
export function FeedCardCompact({ item }: { item: FeedItem }) {
  const meta = item.kind === "blog" ? `${item.readMinutes} min read` : META[item.kind];
  const thumb = mediaUri(item.imageUrl);

  return (
    <Pressable
      onPress={() => router.push(`/content/${item.id}`)}
      style={({ pressed }) => [styles.compact, pressed && { opacity: 0.9 }]}
    >
      <Card style={styles.compactCard}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.compactImage} resizeMode="cover" />
        ) : (
          <View style={styles.compactImageFallback}>
            <Ionicons
              name={item.kind === "reel" ? "play-circle" : "sparkles"}
              size={24}
              color={colors.secondary}
            />
          </View>
        )}
        <View style={styles.compactContent}>
          <View style={styles.compactBadgeRow}>
            <Badge tone={item.kind === "announcement" ? "warning" : "neutral"}>{meta}</Badge>
            {item.pinned && <Ionicons name="pin" size={12} color={colors.secondary} />}
          </View>
          <BodyText style={styles.compactTitle} numberOfLines={2}>
            {item.title}
          </BodyText>
          <BodyText muted style={styles.compactAuthor} numberOfLines={1}>
            {item.author}
          </BodyText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  preview: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  author: {
    fontSize: 12,
  },
  likes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  likesText: {
    fontSize: 12,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.control,
    backgroundColor: colors.borderLight,
  },
  thumbPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: radius.control,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: {
    width: 230,
  },
  compactCard: {
    padding: 0,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  compactImage: {
    width: "100%",
    height: 100,
    backgroundColor: colors.borderLight,
  },
  compactImageFallback: {
    width: "100%",
    height: 75,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  compactContent: {
    padding: spacing.sm + 2,
  },
  compactBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  compactTitle: {
    fontWeight: "700",
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  compactAuthor: {
    fontSize: 11,
    marginTop: 4,
  },
});
