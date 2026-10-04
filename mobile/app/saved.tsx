import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Heading, Card, LoadingView, EmptyState, Badge } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FeedCard } from "@/components/FeedCard";
import { usePlayer } from "@/context/PlayerContext";
import {
  listOfflineItems,
  deleteOfflineItem,
  formatBytes,
  type OfflineItem,
} from "@/lib/offlineStorage";
import { api } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";
import type { FeedItem } from "@/lib/types";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Videos", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Articles", value: "article" },
] as const;

export default function SavedScreen() {
  const router = useRouter();
  const { play, openFullPlayer } = usePlayer();

  const [activeTab, setActiveTab] = useState<"bookmarks" | "offline">("bookmarks");

  // Bookmarks state
  const [type, setType] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offline state
  const [offlineItems, setOfflineItems] = useState<OfflineItem[]>([]);
  const [loadingOffline, setLoadingOffline] = useState(false);

  const loadBookmarks = useCallback(async (filter: string, isRefresh: boolean) => {
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

  const loadOffline = useCallback(async () => {
    setLoadingOffline(true);
    try {
      const downloaded = await listOfflineItems();
      setOfflineItems(downloaded);
    } catch {
      // ignore
    } finally {
      setLoadingOffline(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "bookmarks") {
      loadBookmarks(type, false);
    } else {
      loadOffline();
    }
  }, [activeTab, type, loadBookmarks, loadOffline]);

  const unsave = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.del(`/api/content/${id}/save`);
    } catch {
      loadBookmarks(type, true);
    }
  };

  const handleDeleteOffline = (item: OfflineItem) => {
    Alert.alert("Remove Download", `Remove "${item.title}" from device storage?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteOfflineItem(item.id);
          setOfflineItems((prev) => prev.filter((i) => i.id !== item.id));
        },
      },
    ]);
  };

  const handlePlayOffline = (item: OfflineItem) => {
    play({
      id: item.id,
      title: item.title,
      subtitle: `${item.durationMin || 10} min · Offline Practice`,
      uri: item.localUri,
      mediaType: item.kind === "video" ? "video" : "audio",
      imageUrl: item.localThumbnailUri || item.thumbnailUrl,
      durationSec: (item.durationMin || 10) * 60,
    });
    openFullPlayer();
  };

  const totalOfflineBytes = offlineItems.reduce((acc, i) => acc + (i.fileSizeBytes || 0), 0);

  return (
    <Screen>
      <ScreenHeader title="Saved & Downloads" />

      {/* Main Segmented Switch */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setActiveTab("bookmarks")}
          style={[styles.segmentBtn, activeTab === "bookmarks" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="bookmark-outline"
            size={16}
            color={activeTab === "bookmarks" ? colors.white : colors.textMuted}
          />
          <BodyText style={[styles.segmentText, activeTab === "bookmarks" && styles.segmentTextActive]}>
            Bookmarks
          </BodyText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("offline")}
          style={[styles.segmentBtn, activeTab === "offline" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="cloud-done-outline"
            size={16}
            color={activeTab === "offline" ? colors.white : colors.textMuted}
          />
          <BodyText style={[styles.segmentText, activeTab === "offline" && styles.segmentTextActive]}>
            Offline Downloads
          </BodyText>
        </Pressable>
      </View>

      {/* Bookmarks Tab Content */}
      {activeTab === "bookmarks" && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setType(f.value)}
                style={[styles.chip, type === f.value && styles.chipOn]}
              >
                <BodyText style={{ color: type === f.value ? colors.white : colors.muted, fontSize: 13 }}>
                  {f.label}
                </BodyText>
              </Pressable>
            ))}
          </ScrollView>

          {loading && items.length === 0 ? (
            <LoadingView />
          ) : error ? (
            <EmptyState title="Couldn't load" subtitle={error} onRetry={() => loadBookmarks(type, false)} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nothing saved yet"
              subtitle="Tap the bookmark on anything in Explore or Practices to keep it here."
            />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: spacing.lg }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBookmarks(type, true)} />}
              renderItem={({ item }) => (
                <View style={{ marginBottom: spacing.md }}>
                  <FeedCard item={item} />
                  <Pressable onPress={() => unsave(item.id)} hitSlop={10} style={styles.unsave}>
                    <Ionicons name="bookmark" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Offline Downloads Tab Content */}
      {activeTab === "offline" && (
        <>
          {/* Storage Size Card */}
          <View style={styles.storageCard}>
            <View style={{ flex: 1 }}>
              <BodyText style={{ fontWeight: "700", fontSize: 14 }}>Offline Yoga Cache</BodyText>
              <BodyText muted style={{ fontSize: 12 }}>
                {offlineItems.length} practice{offlineItems.length !== 1 ? "s" : ""} saved ({formatBytes(totalOfflineBytes)})
              </BodyText>
            </View>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
          </View>

          {loadingOffline ? (
            <LoadingView />
          ) : offlineItems.length === 0 ? (
            <EmptyState
              title="No offline practices yet"
              subtitle="Open any practice and tap the download icon to save it for offline yoga sessions."
            />
          ) : (
            <FlatList
              data={offlineItems}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: spacing.lg }}
              refreshControl={<RefreshControl refreshing={loadingOffline} onRefresh={loadOffline} />}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => (
                <Card style={styles.downloadCard}>
                  <Pressable onPress={() => handlePlayOffline(item)} style={styles.downloadCardContent}>
                    {/* Thumbnail */}
                    {item.localThumbnailUri || item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.localThumbnailUri || item.thumbnailUrl! }}
                        style={styles.downloadThumb}
                      />
                    ) : (
                      <View style={[styles.downloadThumb, styles.downloadThumbPlaceholder]}>
                        <Ionicons
                          name={item.kind === "video" ? "videocam" : "flower-outline"}
                          size={24}
                          color={colors.secondary}
                        />
                      </View>
                    )}

                    {/* Details */}
                    <View style={{ flex: 1 }}>
                      <BodyText style={{ fontWeight: "700", fontSize: 14 }}>{item.title}</BodyText>
                      <View style={styles.downloadMetaRow}>
                        {item.category ? (
                          <Badge tone="neutral">{item.category}</Badge>
                        ) : null}
                        <BodyText muted style={{ fontSize: 11 }}>
                          {formatBytes(item.fileSizeBytes)}
                        </BodyText>
                      </View>
                    </View>

                    {/* Play Icon */}
                    <View style={styles.playIconBtn}>
                      <Ionicons name="play" size={16} color={colors.white} />
                    </View>
                  </Pressable>

                  {/* Delete Button */}
                  <Pressable
                    onPress={() => handleDeleteOffline(item)}
                    hitSlop={8}
                    style={styles.deleteOfflineBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </Card>
              )}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unsave: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    padding: 4,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  storageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.sage,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  downloadCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
  },
  downloadCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  downloadThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.control,
  },
  downloadThumbPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4,
  },
  playIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  deleteOfflineBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
