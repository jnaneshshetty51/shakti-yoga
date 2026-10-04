import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Card, Heading, BodyText, Button } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";
import type { FeedItem } from "@/lib/types";

const logo = require("../../assets/splash.png");

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

  const isFounder = item.kind === "founder_message";
  const isAnnouncement = item.kind === "announcement";

  const meta =
    isFounder || isAnnouncement
      ? null
      : item.kind === "article"
      ? item.readMinutes
        ? `${item.readMinutes} min read`
        : null
      : EYEBROW[item.kind].replace("New ", "");
  const subtitle =
    isFounder
      ? "A short message for your practice"
      : item.excerpt || item.caption || null;

  // Founder messages get a special warm-toned card treatment
  if (isFounder) {
    return (
      <Pressable
        onPress={() => router.push(`/content/${item.id}`)}
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <Card style={styles.founderCard}>
          {/* Warm accent bar at top */}
          <View style={styles.founderAccent} />

          <View style={styles.founderContent}>
            {/* Header row with founder avatar */}
            <View style={styles.founderHeader}>
              <Image source={logo} style={styles.founderAvatar} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <BodyText style={styles.founderEyebrow}>{EYEBROW.founder_message}</BodyText>
                <BodyText muted style={styles.founderBadge}>Founder's Message</BodyText>
              </View>
            </View>

            {/* Title — larger for founder messages */}
            <Heading size="md" style={styles.founderTitle}>
              {item.title}
            </Heading>

            {/* Quote-style subtitle */}
            {subtitle && (
              <View style={styles.quoteContainer}>
                <View style={styles.quoteLine} />
                <BodyText muted style={styles.quoteText} numberOfLines={2}>
                  {subtitle}
                </BodyText>
              </View>
            )}

            <View style={styles.buttonRow} pointerEvents="none">
              <Button variant="secondary">{CTA_LABEL.founder_message}</Button>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  // Default card for non-founder content
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
        <View style={styles.buttonRow} pointerEvents="none">
          <Button variant="outline">
            {CTA_LABEL[item.kind]}
          </Button>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ─── Default card ───────────────────────────────────
  card: { marginBottom: spacing.lg },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  meta: { fontSize: 12, marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  buttonRow: { marginTop: spacing.md, alignItems: "flex-start" },

  // ─── Founder card ───────────────────────────────────
  founderCard: {
    marginBottom: spacing.lg,
    padding: 0,
    overflow: "hidden",
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary + "30",
  },
  founderAccent: {
    height: 3,
    backgroundColor: colors.secondary,
  },
  founderContent: {
    padding: spacing.md,
  },
  founderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  founderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  founderEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondary,
  },
  founderBadge: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  founderTitle: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  quoteContainer: {
    flexDirection: "row",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  quoteLine: {
    width: 3,
    backgroundColor: colors.secondary + "60",
    borderRadius: 2,
  },
  quoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
