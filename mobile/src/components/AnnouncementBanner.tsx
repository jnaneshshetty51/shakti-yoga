import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem } from "@/lib/types";

const KEY = "dismissed_announcements";

export function AnnouncementBanner() {
  const [item, setItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ announcement: FeedItem | null }>("/api/content/home");
        if (!res.announcement || cancelled) return;
        const raw = await AsyncStorage.getItem(KEY);
        const dismissed: string[] = raw ? JSON.parse(raw) : [];
        if (!dismissed.includes(res.announcement.id)) setItem(res.announcement);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!item) return null;

  const dismiss = async () => {
    setItem(null);
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const dismissed: string[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(KEY, JSON.stringify([...dismissed, item.id]));
    } catch {
      /* ignore */
    }
  };

  return (
    <Pressable onPress={() => router.push(`/content/${item.id}`)} style={styles.banner}>
      <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
      <BodyText style={{ flex: 1, fontWeight: "600" }} numberOfLines={2}>{item.title}</BodyText>
      <Pressable onPress={dismiss} hitSlop={10}>
        <Ionicons name="close" size={16} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
