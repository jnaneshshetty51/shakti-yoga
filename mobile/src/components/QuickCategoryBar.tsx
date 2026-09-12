import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BodyText } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

interface CategoryPill {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const CATEGORIES: CategoryPill[] = [
  { id: "batches", label: "Daily Batches", icon: "calendar-outline", route: "/(tabs)/classes" },
  { id: "practices", label: "Practices", icon: "leaf-outline", route: "/practices" },
  { id: "therapy", label: "Yoga Therapy", icon: "medkit-outline", route: "/therapy-intake" },
  { id: "challenges", label: "Challenges", icon: "trophy-outline", route: "/challenges" },
  { id: "card", label: "Digital Pass", icon: "qr-code-outline", route: "/membership-card" },
  { id: "events", label: "Retreats", icon: "sparkles-outline", route: "/events" },
  { id: "saved", label: "Saved", icon: "bookmark-outline", route: "/saved" },
];

export function QuickCategoryBar() {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => router.push(cat.route as any)}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={cat.icon} size={15} color={colors.primary} />
            </View>
            <BodyText style={styles.pillLabel}>{cat.label}</BodyText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  pillPressed: {
    backgroundColor: colors.accent,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
