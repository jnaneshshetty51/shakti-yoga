import React, { useState } from "react";
import { FlatList, View, Pressable, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { resolveNotificationPath } from "@/lib/deepLink";
import { colors, spacing } from "@/theme";

interface ActivityItem {
  id: string;
  kind: "alert" | "reminder" | "info";
  severity: "high" | "medium" | "low";
  title: string;
  body?: string;
  href: string;
  at: string;
  read: boolean;
}
interface ActivityResponse {
  items: ActivityItem[];
  unreadCount: number;
  seenAt: string | null;
}

const DOT_COLOR: Record<ActivityItem["severity"], string> = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.muted,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export default function ActivityScreen() {
  const { data, loading, error, reload } = useResource(
    () => api.get<ActivityResponse>("/api/activity"),
    [],
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.post("/api/activity", { action: "markAllRead" });
      await reload();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await api.post("/api/activity", { action: "dismiss", id });
    } catch {
      /* ignore */
    }
  };

  const items = (data?.items ?? []).filter((i) => !dismissed.has(i.id));

  return (
    <Screen>
      <ScreenHeader title="Activity" />
      {data && data.items.length > 0 && (
        <Pressable onPress={markAllRead} disabled={busy} style={styles.markAll}>
          <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Mark all read</BodyText>
        </Pressable>
      )}
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load activity" subtitle={error} />
      ) : items.length === 0 ? (
        <EmptyState title="You're all caught up" subtitle="Reminders about classes, sessions and billing show up here." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(resolveNotificationPath(item.href))}>
              <Card style={[styles.card, !item.read && styles.unread]}>
                <View style={[styles.dot, { backgroundColor: DOT_COLOR[item.severity] }]} />
                <View style={{ flex: 1 }}>
                  <BodyText style={{ fontWeight: item.read ? "500" : "700" }}>{item.title}</BodyText>
                  {item.body && (
                    <BodyText muted style={{ fontSize: 13, marginTop: 2 }}>{item.body}</BodyText>
                  )}
                  <BodyText muted style={{ fontSize: 11, marginTop: 4 }}>{relativeTime(item.at)}</BodyText>
                </View>
                <Pressable onPress={() => dismiss(item.id)} hitSlop={10}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </Pressable>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { alignSelf: "flex-end", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  unread: { borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
