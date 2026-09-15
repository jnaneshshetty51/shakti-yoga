import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Heading, BodyText } from "@/components/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { colors, spacing, radius, shadows } from "@/theme";

interface HomeHeaderProps {
  userName?: string;
  unreadNotifications?: number;
}

/** Deliberately minimal — greeting, avatar, notifications. Nothing else. */
export function HomeHeader({ userName, unreadNotifications = 0 }: HomeHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const firstName = userName ? userName.trim().split(" ")[0] : "";
    return firstName ? `${timeOfDay}, ${firstName}` : timeOfDay;
  }, [userName]);

  const initials = useMemo(() => {
    if (!userName) return "SY";
    const parts = userName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [userName]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Profile settings"
        >
          <BodyText style={styles.avatarText}>{initials}</BodyText>
        </Pressable>

        <Heading size="lg" style={styles.greetingTitle}>
          {greeting} 🌿
        </Heading>

        <NotificationBell count={unreadNotifications} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.subtle,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  greetingTitle: {
    flex: 1,
    fontSize: 22,
    color: colors.primary,
    fontWeight: "700",
  },
});
