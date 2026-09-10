import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FeedCard } from "@/components/FeedCard";
import { api } from "@/lib/api";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem } from "@/lib/types";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Reels", value: "reel" },
  { label: "Posts", value: "post" },
] as const;

export default function SavedScreen() {
  const [type, setType] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filter: string, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: FeedItem[] }>(`/api/content/saved?type=${filter}`);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your saved items");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(type, false);
  }, [type, load]);

  const unsave = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.del(`/api/content/${id}/save`);
    } catch {
      load(type, true);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Saved" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.value} onPress={() => setType(f.value)} style={[styles.chip, type === f.value && styles.chipOn]}>
            <BodyText style={{ color: type === f.value ? colors.white : colors.muted, fontSize: 13 }}>{f.label}</BodyText>
          </Pressable>
        ))}
      </ScrollView>

      {loading && items.length === 0 ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load" subtitle={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing saved yet" subtitle="Tap the bookmark on anything in Explore to keep it here." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(type, true)} />}
          renderItem={({ item }) => (
            <View>
              <FeedCard item={item} />
              <Pressable onPress={() => unsave(item.id)} hitSlop={10} style={styles.unsave}>
                <Ionicons name="bookmark" size={18} color={colors.primary} />
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  unsave: { position: "absolute", top: spacing.sm, right: spacing.sm, padding: 4, backgroundColor: colors.white, borderRadius: radius.pill },
});
