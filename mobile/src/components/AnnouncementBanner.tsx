import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText } from "@/components/ui";
import { colors, spacing, radius } from "@/theme";
import type { FeedItem } from "@/lib/types";

const KEY = "dismissed_announcements";

/** Renders the pinned announcement from the Home payload, unless the member has
 *  dismissed it (dismissal is stored per content id in AsyncStorage). */
export function AnnouncementBanner({ announcement }: { announcement: FeedItem | null }) {
  const [item, setItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (!announcement) {
      setItem(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const dismissed: string[] = raw ? JSON.parse(raw) : [];
        if (!cancelled) setItem(dismissed.includes(announcement.id) ? null : announcement);
      } catch {
        if (!cancelled) setItem(announcement);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [announcement]);

  if (!item) return null;

  const important = "important" in item && item.important;

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
    <Pressable
      onPress={() => router.push(`/content/${item.id}`)}
      style={[styles.banner, important && styles.bannerImportant]}
    >
      <Ionicons
        name={important ? "alert-circle" : "megaphone-outline"}
        size={18}
        color={important ? colors.white : colors.primary}
      />
      <BodyText
        style={{ flex: 1, fontWeight: "700", color: important ? colors.white : colors.text }}
        numberOfLines={3}
      >
        {item.title}
      </BodyText>
      {/* Important announcements stay on top and can't be dismissed. */}
      {!important && (
        <Pressable onPress={dismiss} hitSlop={10}>
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      )}
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
  bannerImportant: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
