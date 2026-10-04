import React, { useMemo, useRef, useState } from "react";
import { ScrollView, View, Image, Pressable, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TestimonialSubmitModal } from "@/components/TestimonialSubmitModal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";

interface Testimonial {
  id: string;
  authorName: string;
  location: string | null;
  planType: string | null;
  quote: string;
  rating: number;
  imageUrl: string | null;
}

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= n ? "star" : "star-outline"}
          size={14}
          color={colors.secondary}
        />
      ))}
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CAROUSEL_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const FILTERS = [
  { label: "All", value: "all" },
  { label: "Everyday Yoga", value: "Everyday Yoga" },
  { label: "Yoga Therapy", value: "Yoga Therapy" },
  { label: "Starter", value: "Starter" },
];

export default function TestimonialsScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => api.get<Testimonial[]>("/api/content/testimonials"),
    [],
  );
  const [filter, setFilter] = useState("all");
  const [showSubmit, setShowSubmit] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((t) => t.planType === filter);
  }, [data, filter]);

  const featured = filtered.slice(0, 5);
  const rest = filtered.slice(5);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setCarouselIndex(idx);
  };

  return (
    <Screen>
      <ScreenHeader title="Success Stories" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load stories" subtitle={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState title="No stories yet" subtitle="Be the first to share your experience!" />
          {user && user.role !== "visitor" && (
            <View style={{ padding: spacing.lg }}>
              <Button onPress={() => setShowSubmit(true)}>Share Your Story</Button>
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, filter === f.value && styles.chipActive]}
              >
                <BodyText
                  style={{
                    color: filter === f.value ? colors.white : colors.muted,
                    fontSize: 12,
                    fontWeight: filter === f.value ? "700" : "400",
                  }}
                >
                  {f.label}
                </BodyText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Featured carousel */}
          {featured.length > 0 && (
            <View style={styles.carouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={100}
                style={{ marginHorizontal: -spacing.lg }}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                snapToInterval={CAROUSEL_WIDTH + spacing.sm}
                decelerationRate="fast"
              >
                {featured.map((t) => (
                  <View key={t.id} style={[styles.carouselCard, { width: CAROUSEL_WIDTH }]}>
                    <Card style={styles.featuredCard}>
                      {t.imageUrl && (
                        <Image source={{ uri: t.imageUrl }} style={styles.featuredImage} />
                      )}
                      <View style={styles.featuredContent}>
                        <Stars n={t.rating} />
                        <BodyText style={styles.featuredQuote} numberOfLines={4}>
                          &ldquo;{t.quote}&rdquo;
                        </BodyText>
                        <View style={styles.featuredAuthor}>
                          <View style={styles.authorDot} />
                          <BodyText style={styles.authorName}>{t.authorName}</BodyText>
                          {t.location && (
                            <BodyText muted style={styles.authorMeta}> · {t.location}</BodyText>
                          )}
                        </View>
                        {t.planType && (
                          <BodyText style={styles.planBadge}>{t.planType}</BodyText>
                        )}
                      </View>
                    </Card>
                  </View>
                ))}
              </ScrollView>

              {/* Dots */}
              {featured.length > 1 && (
                <View style={styles.dots}>
                  {featured.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === carouselIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Remaining testimonials */}
          {rest.map((t) => (
            <Card key={t.id} style={styles.storyCard}>
              <View style={styles.storyHeader}>
                {t.imageUrl ? (
                  <Image source={{ uri: t.imageUrl }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatar, styles.avatarFallback]}>
                    <BodyText style={styles.avatarInitial}>
                      {t.authorName.charAt(0).toUpperCase()}
                    </BodyText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <BodyText style={{ fontWeight: "700" }}>{t.authorName}</BodyText>
                  <BodyText muted style={{ fontSize: 12 }}>
                    {[t.location, t.planType].filter(Boolean).join(" · ")}
                  </BodyText>
                </View>
                <Stars n={t.rating} />
              </View>
              <BodyText style={styles.storyQuote}>&ldquo;{t.quote}&rdquo;</BodyText>
            </Card>
          ))}

          {/* Submit CTA */}
          {user && user.role !== "visitor" && (
            <Pressable
              onPress={() => setShowSubmit(true)}
              style={({ pressed }) => [styles.submitCta, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.submitIcon}>
                <Ionicons name="heart-outline" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <BodyText style={{ fontWeight: "700", color: colors.primary }}>
                  Share your story
                </BodyText>
                <BodyText muted style={{ fontSize: 12 }}>
                  Inspire fellow practitioners
                </BodyText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Submit modal */}
      <TestimonialSubmitModal
        visible={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmitted={() => reload()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  filterRow: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  carouselContainer: {
    marginBottom: spacing.lg,
  },
  carouselCard: {
    marginRight: spacing.sm,
  },
  featuredCard: {
    overflow: "hidden",
    padding: 0,
  },
  featuredImage: {
    width: "100%",
    height: 160,
  },
  featuredContent: {
    padding: spacing.md,
  },
  featuredQuote: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
    marginTop: spacing.sm,
    color: colors.text,
  },
  featuredAuthor: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  authorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    marginRight: 8,
  },
  authorName: {
    fontWeight: "700",
    fontSize: 13,
  },
  authorMeta: {
    fontSize: 13,
  },
  planBadge: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  storyCard: {
    marginBottom: spacing.md,
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  storyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  storyQuote: {
    fontStyle: "italic",
    fontSize: 14,
    lineHeight: 20,
  },
  submitCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.secondary + "30",
    marginTop: spacing.sm,
  },
  submitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
