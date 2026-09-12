import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Heading } from "@/components/ui";
import { FeedCardCompact } from "@/components/FeedCard";
import { spacing } from "@/theme";
import type { FeedItem } from "@/lib/types";

interface ContentRailProps {
  title: string;
  items: FeedItem[];
}

/** Horizontal strip of compact content cards for Home discovery with edge-to-edge scrolling. */
export function ContentRail({ title, items }: ContentRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Heading size="sm" style={styles.heading}>
        {title}
      </Heading>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        renderItem={({ item }) => <FeedCardCompact item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: 18,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  listContent: {
    paddingRight: spacing.lg,
  },
});
