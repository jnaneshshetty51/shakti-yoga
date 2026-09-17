import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Card, Heading, BodyText, Button } from "@/components/ui";
import { colors, spacing } from "@/theme";
import type { FeedItem } from "@/lib/types";

const EYEBROW: Record<FeedItem["kind"], string> = {
  video: "New Practice",
  audio: "New Audio",
  article: "New Article",
  founder_message: "From Acharya Swasthik",
  announcement: "From Shakti",
};

const CTA_LABEL: Record<FeedItem["kind"], string> = {
  video: "Practice",
  audio: "Listen",
  article: "Read",
  founder_message: "Watch",
  announcement: "View",
};

/** One relevant piece of content — deliberately singular. Home is not a feed. */
export function FromShaktiCard({ item }: { item: FeedItem | null | undefined }) {
  if (!item) return null;

  const meta =
    item.kind === "founder_message"
      ? null
      : item.kind === "article"
      ? item.readMinutes
        ? `${item.readMinutes} min read`
        : null
      : EYEBROW[item.kind].replace("New ", "");
  const subtitle =
    item.kind === "founder_message" ? "A short message for your practice" : item.excerpt || item.caption || null;

  return (
    <Pressable onPress={() => router.push(`/content/${item.id}`)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      <Card style={styles.card}>
        <BodyText muted style={styles.eyebrow}>{EYEBROW[item.kind]}</BodyText>
        <Heading size="sm" style={{ marginTop: 2 }}>{item.title}</Heading>
        {meta && <BodyText muted style={styles.meta}>{meta}</BodyText>}
        {subtitle && (
          <BodyText muted style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </BodyText>
        )}
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={() => router.push(`/content/${item.id}`)}>
            {CTA_LABEL[item.kind]}
          </Button>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  meta: { fontSize: 12, marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  buttonRow: { marginTop: spacing.md, alignItems: "flex-start" },
});
