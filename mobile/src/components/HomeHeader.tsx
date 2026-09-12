import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText } from "@/components/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { colors, spacing, radius, shadows } from "@/theme";

const SUTRAS = [
  {
    sanskrit: "Sthira Sukham Asanam",
    translation: "Balance steady effort with gentle ease in every posture.",
  },
  {
    sanskrit: "Yogas Chitta Vritti Nirodha",
    translation: "Yoga is the quiet stilling of the mind's restless turns.",
  },
  {
    sanskrit: "Santosha Anuttamah Sukha Labhah",
    translation: "From contentment comes unexcelled inner joy and peace.",
  },
  {
    sanskrit: "Prana Samyama",
    translation: "When breath flows with awareness, life force awakens.",
  },
  {
    sanskrit: "Ahimsa Bhavana",
    translation: "Approach your practice and body with unconditional compassion.",
  },
  {
    sanskrit: "Tapas & Vairagya",
    translation: "Devoted practice paired with peaceful non-attachment.",
  },
  {
    sanskrit: "Svadhyaya",
    translation: "Self-study and gentle reflection illuminate your inner sanctuary.",
  },
];

interface HomeHeaderProps {
  userName?: string;
  unreadNotifications?: number;
}

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

  const dailySutra = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
    );
    return SUTRAS[dayOfYear % SUTRAS.length];
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Bar: Profile Avatar, Greeting & Notifications */}
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Profile settings"
        >
          <BodyText style={styles.avatarText}>{initials}</BodyText>
        </Pressable>

        <View style={styles.greetingContainer}>
          <BodyText muted style={styles.dateText}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </BodyText>
          <Heading size="lg" style={styles.greetingTitle}>
            {greeting}
          </Heading>
        </View>

        <NotificationBell count={unreadNotifications} />
      </View>

      {/* Intention of the Day Pill */}
      <View style={styles.intentionBox}>
        <View style={styles.intentionHeader}>
          <Ionicons name="sparkles-sharp" size={13} color={colors.secondary} />
          <BodyText style={styles.intentionLabel}>DAILY INTENTION</BodyText>
          <View style={styles.dotSeparator} />
          <BodyText style={styles.sanskritText}>{dailySutra.sanskrit}</BodyText>
        </View>
        <BodyText style={styles.translationText}>
          &ldquo;{dailySutra.translation}&rdquo;
        </BodyText>
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
  greetingContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
    color: colors.secondary,
    marginBottom: 2,
  },
  greetingTitle: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: "700",
  },
  intentionBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  intentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  intentionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sanskritText: {
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "600",
    color: colors.primary,
  },
  translationText: {
    fontSize: 13,
    color: colors.text,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
