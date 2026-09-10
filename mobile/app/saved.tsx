import React from "react";
import { View, FlatList } from "react-native";
import { Screen, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FeedCard } from "@/components/FeedCard";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";
import type { FeedItem } from "@/lib/types";

export default function SavedScreen() {
  const { data, loading, error } = useResource(
    () => api.get<{ items: FeedItem[] }>("/api/content/saved?type=all"),
    [],
  );

  return (
    <Screen>
      <ScreenHeader title="Saved" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load" subtitle={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nothing saved yet" subtitle="Tap the bookmark on anything in Explore to keep it here." />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <View>
              <FeedCard item={item} />
            </View>
          )}
        />
      )}
    </Screen>
  );
}
