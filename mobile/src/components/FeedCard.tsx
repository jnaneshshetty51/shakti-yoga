import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText, Card, Badge } from "@/components/ui";
import { mediaUri } from "@/lib/media";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem } from "@/lib/types";

const META: Record<FeedItem["kind"], string> = {
  reel: "Reel",
  post: "Post",
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
              {item.pinned && <Ionicons name="pin" size={14} color={colors.muted} />}
            </View>
            <BodyText style={{ fontWeight: "700", fontSize: 16, marginTop: spacing.xs }}>{item.title}</BodyText>
            {preview ? (
              <BodyText muted style={{ marginTop: spacing.xs }} numberOfLines={2}>{preview}</BodyText>
            ) : null}
            <BodyText muted style={{ fontSize: 12, marginTop: spacing.sm }}>
              {item.author}
              {item.kind !== "blog" ? `  ·  ♥ ${item.likeCount}` : ""}
            </BodyText>
          </View>
          {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

/** Fixed-width variant for horizontal rails (Home discovery strips). */
export function FeedCardCompact({ item }: { item: FeedItem }) {
  const meta = item.kind === "blog" ? `${item.readMinutes} min read` : META[item.kind];
  return (
    <Pressable onPress={() => router.push(`/content/${item.id}`)} style={styles.compact}>
      <Card style={styles.compactCard}>
        <Badge tone={item.kind === "announcement" ? "warning" : "neutral"}>{meta}</Badge>
        <BodyText style={{ fontWeight: "700", fontSize: 14, marginTop: spacing.xs }} numberOfLines={3}>
          {item.title}
        </BodyText>
        <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }} numberOfLines={1}>
          {item.author}
        </BodyText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  thumb: { width: 72, height: 72, borderRadius: radius.control, backgroundColor: colors.border },
  compact: { width: 220 },
  compactCard: { height: 132, justifyContent: "flex-start" },
});
