import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { FeedCard } from "@/components/FeedCard";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing } from "@/theme";
import type { FeedItem, FeedResponse } from "@/lib/types";

interface Practice {
  id: string;
  title: string;
  category: string;
  durationMin: number;
  videoUrl: string | null;
}

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Reels", value: "reel" },
  { label: "Posts", value: "post" },
  { label: "Articles", value: "blog" },
] as const;

function TakeAMoment() {
  const { data } = useResource(() => api.get<{ practices: Practice[] }>("/api/practices"), []);
  const short = (data?.practices ?? []).filter((p) => p.durationMin <= 15).slice(0, 8);
  if (short.length === 0) return null;
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Heading size="sm" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>Take a Moment</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {short.map((p) => (
          <Pressable key={p.id} onPress={() => p.videoUrl && WebBrowser.openBrowserAsync(p.videoUrl)}>
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
  const [type, setType] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const loadPage = useCallback(async (nextCursor: number, filter: string, replace: boolean) => {
    const id = ++reqId.current;
    if (replace) setLoading(true); else setLoadingMore(true);
    setError(null);
    try {
      const res = await api.get<FeedResponse>(`/api/content/feed?cursor=${nextCursor}&limit=20&type=${filter}`);
      if (id !== reqId.current) return;
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : "Couldn't load the feed");
    } finally {
      if (id === reqId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setCursor(0);
    loadPage(0, type, true);
  }, [type, loadPage]);

  const onEndReached = () => {
    if (cursor != null && !loadingMore && !loading) loadPage(cursor, type, false);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">Explore</Heading>
        <Pressable onPress={() => router.push("/saved")} hitSlop={10}>
          <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <>
            {type === "all" && <TakeAMoment />}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => (
                <Pressable key={f.value} onPress={() => setType(f.value)} style={[styles.chip, type === f.value && styles.chipOn]}>
                  <BodyText style={{ color: type === f.value ? colors.white : colors.muted, fontSize: 13 }}>{f.label}</BodyText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => <View style={{ paddingHorizontal: spacing.lg }}><FeedCard item={item} /></View>}
        ListEmptyComponent={
          loading ? <LoadingView /> : error ? <EmptyState title="Couldn't load" subtitle={error} /> : <EmptyState title="Nothing here yet" subtitle="New content is added regularly." />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  momentCard: { width: 150 },
});
