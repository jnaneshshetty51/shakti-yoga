import React from "react";
import { View, FlatList } from "react-native";
import { Heading } from "@/components/ui";
import { FeedCardCompact } from "@/components/FeedCard";
import { spacing } from "@/theme";
import type { FeedItem } from "@/lib/types";

/** Horizontal strip of compact content cards for the Home discovery sections. */
export function ContentRail({ title, items }: { title: string; items: FeedItem[] }) {
  if (!items.length) return null;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Heading size="sm" style={{ marginBottom: spacing.sm }}>{title}</Heading>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        renderItem={({ item }) => <FeedCardCompact item={item} />}
      />
    </View>
  );
}
