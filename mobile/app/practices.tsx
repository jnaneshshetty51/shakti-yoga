import React, { useState } from "react";
import { FlatList, View, Image, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { mediaUri } from "@/lib/media";
import { LEVEL_LABEL, PRACTICE_LEVELS, CONTENT_CATEGORIES, categoryLabel } from "@/lib/practice";
import { colors, spacing, radius } from "@/theme";
import type { PracticeView, PracticeLevel } from "@/lib/types";

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <BodyText style={{ color: on ? colors.white : colors.muted, fontSize: 13 }}>{label}</BodyText>
    </Pressable>
  );
}

export default function PracticesScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<PracticeLevel | null>(null);

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (level) qs.set("level", level);
  const query = qs.toString();

  const { data, loading, error, reload } = useResource(
    () => api.get<{ practices: PracticeView[] }>(`/api/practices${query ? `?${query}` : ""}`),
    [query],
  );

  const practices = data?.practices ?? [];

  return (
    <Screen>
      <ScreenHeader title="Practices" />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="All" on={!category} onPress={() => setCategory(null)} />
          {CONTENT_CATEGORIES.map((c) => (
            <Chip key={c} label={categoryLabel(c)} on={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Any level" on={!level} onPress={() => setLevel(null)} />
          {PRACTICE_LEVELS.map((l) => (
            <Chip key={l} label={LEVEL_LABEL[l]} on={level === l} onPress={() => setLevel(l)} />
          ))}
        </ScrollView>
      </View>

      {loading && practices.length === 0 ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load practices" subtitle={error} />
      ) : practices.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="Try a different filter." />
      ) : (
        <FlatList
          data={practices}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const thumb = mediaUri(item.thumbnailUrl);
            return (
              <Pressable onPress={() => router.push(`/practice/${item.id}`)}>
                <Card style={styles.row}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Ionicons name="leaf-outline" size={20} color={colors.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <BodyText style={{ fontWeight: "700" }} numberOfLines={2}>{item.title}</BodyText>
                    <View style={styles.meta}>
                      <Badge>{LEVEL_LABEL[item.level]}</Badge>
                      <BodyText muted style={{ fontSize: 12 }}>{item.durationMin} min</BodyText>
                    </View>
                  </View>
                  {item.completed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  )}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.control, backgroundColor: colors.border },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
});
