import React from "react";
import { ScrollView, View, Pressable, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface FounderMessage {
  id: string;
  title: string;
  excerpt: string | null;
  caption: string | null;
  imageUrl: string | null;
  publishedAt: string;
}

interface FeedResponse {
  items: FounderMessage[];
}

const logo = require("../assets/splash.png");

export default function FounderMessagesScreen() {
  const { data, loading, error, reload } = useResource(
    () => api.get<FeedResponse>("/api/content/feed?type=FOUNDER_MESSAGE"),
    [],
  );

  return (
    <Screen>
      <ScreenHeader title="From the Founder" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load messages" subtitle={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No messages yet"
          subtitle="Messages from Acharya Swasthik will appear here."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header card */}
          <View style={styles.headerCard}>
            <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Heading size="sm" style={{ color: colors.primary }}>
                Acharya Swasthik
              </Heading>
              <BodyText muted style={{ fontSize: 12, marginTop: 2 }}>
                Founder, Shakti Yoga Kendra
              </BodyText>
            </View>
          </View>

          {/* Messages list */}
          {data.items.map((msg, index) => (
            <Pressable
              key={msg.id}
              onPress={() => router.push(`/content/${msg.id}`)}
              style={({ pressed }) => pressed && { opacity: 0.9 }}
            >
              <Card style={styles.messageCard}>
                <View style={styles.messageAccent} />
                <View style={styles.messageContent}>
                  {/* Date */}
                  <BodyText muted style={styles.date}>
                    {new Date(msg.publishedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </BodyText>

                  {/* Title */}
                  <BodyText style={styles.title}>{msg.title}</BodyText>

                  {/* Excerpt */}
                  {(msg.excerpt || msg.caption) && (
                    <BodyText muted style={styles.excerpt} numberOfLines={2}>
                      {msg.excerpt || msg.caption}
                    </BodyText>
                  )}

                  {/* Read CTA */}
                  <View style={styles.readRow}>
                    <BodyText style={styles.readLabel}>Read message</BodyText>
                    <Ionicons name="arrow-forward" size={14} color={colors.secondary} />
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary + "30",
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  messageCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
  },
  messageAccent: {
    width: 3,
    backgroundColor: colors.secondary,
  },
  messageContent: {
    flex: 1,
    padding: spacing.md,
  },
  date: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 22,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  readRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  readLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondary,
  },
});
