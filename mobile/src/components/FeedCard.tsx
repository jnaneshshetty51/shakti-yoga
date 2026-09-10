import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText, Card, Badge } from "@/components/ui";
import { colors, spacing } from "@/theme";
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

  return (
    <Pressable onPress={() => router.push(`/content/${item.id}`)}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <Badge tone={item.kind === "announcement" ? "warning" : "neutral"}>{meta}</Badge>
          {item.pinned && <Ionicons name="pin" size={14} color={colors.muted} />}
        </View>
        <BodyText style={{ fontWeight: "700", fontSize: 16, marginTop: spacing.xs }}>{item.title}</BodyText>
        {preview && (
          <BodyText muted style={{ marginTop: spacing.xs }} numberOfLines={2}>{preview}</BodyText>
        )}
        <BodyText muted style={{ fontSize: 12, marginTop: spacing.sm }}>
          {item.author}
          {item.kind !== "blog" ? `  ·  ♥ ${item.likeCount}` : ""}
        </BodyText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
