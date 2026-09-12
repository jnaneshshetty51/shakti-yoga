import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

interface TeacherWisdomProps {
  onPress?: () => void;
}

export function TeacherWisdomCard({ onPress }: TeacherWisdomProps) {
  return (
    <Pressable
      onPress={() => (onPress ? onPress() : router.push("/(tabs)/practice"))}
      style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.9 }]}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.teacherAvatar}>
            <Ionicons name="flower-outline" size={18} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <BodyText style={styles.eyebrow}>WISDOM FROM THE KENDRA</BodyText>
            <Heading size="sm" style={styles.teacherName}>
              Acharya Arun &amp; Priya
            </Heading>
          </View>
          <Ionicons name="sparkles" size={16} color={colors.secondary} />
        </View>

        <BodyText style={styles.quoteText}>
          &ldquo;True asana begins when you want to leave the posture. In that subtle moment of stillness, observe your breath without reacting. That is where inner resilience transforms into peace.&rdquo;
        </BodyText>

        <View style={styles.footerRow}>
          <BodyText style={styles.readMore}>Read Lineage Reflections</BodyText>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
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
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  teacherName: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 1,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: spacing.xs,
  },
  readMore: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
});
