import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

interface DailyRitualCardProps {
  onPress?: () => void;
}

export function DailyRitualCard({ onPress }: DailyRitualCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/practices");
    }
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.9 }]}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={styles.tagRow}>
            <View style={styles.leafIconBox}>
              <Ionicons name="leaf-outline" size={14} color={colors.secondary} />
            </View>
            <BodyText style={styles.tagText}>TODAY&apos;S MICRO-RITUAL</BodyText>
            <View style={styles.durationPill}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <BodyText style={styles.durationText}>4 min</BodyText>
            </View>
          </View>

          <Heading size="sm" style={styles.title}>
            Nadi Shodhana · Alternate Nostril Breath
          </Heading>

          <BodyText muted style={styles.benefit} numberOfLines={2}>
            Gently harmonize the nervous system, lower cortisol, and settle mental fluctuations.
          </BodyText>
        </View>

        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color={colors.white} style={{ marginLeft: 2 }} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  leafIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.sage,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: "auto",
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  title: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  benefit: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
});
