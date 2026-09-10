import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { FeedCard } from "@/components/FeedCard";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { CONTENT_CATEGORIES, categoryLabel } from "@/lib/practice";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem, FeedResponse, PracticeView } from "@/lib/types";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Reels", value: "reel" },
  { label: "Posts", value: "post" },
  { label: "Announcements", value: "announcement" },
  { label: "Articles", value: "blog" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <BodyText style={{ color: on ? colors.white : colors.muted, fontSize: 13 }}>{label}</BodyText>
    </Pressable>
  );
}

function TakeAMoment() {
  const { data } = useResource(() => api.get<{ practices: PracticeView[] }>("/api/practices"), []);
  const short = (data?.practices ?? []).filter((p) => p.durationMin <= 15).slice(0, 8);
  if (short.length === 0) return null;
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Heading size="sm" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>Take a Moment</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {short.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/practice/${p.id}`)}>
            <Card style={styles.momentCard}>
              <Ionicons name="play-circle-outline" size={22} color={colors.primary} />
              <BodyText style={{ fontWeight: "700", marginTop: spacing.xs }} numberOfLines={2}>{p.title}</BodyText>
              <BodyText muted style={{ fontSize: 12, marginTop: 2 }}>{p.durationMin} min</BodyText>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ExploreScreen() {
  const [type, setType] = useState<FilterValue>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const showCategories = type !== "blog";
  const effectiveCategory = showCategories ? category : null;

  const loadPage = useCallback(
    async (nextCursor: number, filter: string, cat: string | null, replace: boolean) => {
      const id = ++reqId.current;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ cursor: String(nextCursor), limit: "20", type: filter });
        if (cat) qs.set("category", cat);
        const res = await api.get<FeedResponse>(`/api/content/feed?${qs.toString()}`);
        if (id !== reqId.current) return;
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : "Couldn't load the feed");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    setItems([]);
    setCursor(0);
    loadPage(0, type, effectiveCategory, true);
  }, [type, effectiveCategory, loadPage]);

  const onEndReached = () => {
    if (cursor != null && !loadingMore && !loading) loadPage(cursor, type, effectiveCategory, false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPage(0, type, effectiveCategory, true);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">Explore</Heading>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Pressable onPress={() => router.push("/practices")} hitSlop={10}>
            <Ionicons name="leaf-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => router.push("/saved")} hitSlop={10}>
            <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {type === "all" && !category && <TakeAMoment />}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {FILTERS.map((f) => (
                <Chip key={f.value} label={f.label} on={type === f.value} onPress={() => setType(f.value)} />
              ))}
            </ScrollView>
            {showCategories && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="All topics" on={!category} onPress={() => setCategory(null)} />
                {CONTENT_CATEGORIES.map((c) => (
                  <Chip key={c} label={categoryLabel(c)} on={category === c} onPress={() => setCategory(c)} />
                ))}
              </ScrollView>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <FeedCard item={item} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingView />
          ) : error ? (
            <View style={{ padding: spacing.lg }}>
              <EmptyState title="Couldn't load" subtitle={error} />
              <Button variant="outline" onPress={onRefresh} style={{ marginTop: spacing.md }}>Try again</Button>
            </View>
          ) : (
            <EmptyState title="Nothing here yet" subtitle="New content is added regularly." />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  chipRow: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  momentCard: { width: 150 },
});
