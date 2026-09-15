import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";
import type { PracticeView } from "@/lib/types";

const MAX_MINUTES = 15;

/** A reason to open the app even without a live class — short, self-guided practices. */
export function TakeAMomentSection() {
  const { data } = useResource(() => api.get<{ practices: PracticeView[] }>("/api/practices"), []);
  const short = (data?.practices ?? [])
    .filter((p) => p.durationMin <= MAX_MINUTES)
    .sort((a, b) => a.durationMin - b.durationMin);

  if (short.length === 0) return null;
  const [primary, ...rest] = short;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <BodyText muted style={styles.eyebrow}>Take a Moment</BodyText>
      <Pressable onPress={() => router.push(`/practice/${primary.id}`)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
        <Card style={styles.primaryCard}>
          <View style={{ flex: 1 }}>
            <BodyText style={styles.primaryMeta}>{primary.durationMin} min · {primary.title}</BodyText>
            <BodyText muted style={styles.primaryDescription} numberOfLines={2}>
              {primary.description || "A short practice for busy days."}
            </BodyText>
          </View>
          <View style={styles.beginButton}>
            <Ionicons name="play" size={18} color={colors.white} style={{ marginLeft: 2 }} />
          </View>
        </Card>
      </Pressable>

      {rest.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {rest.map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/practice/${p.id}`)}>
              <View style={styles.chip}>
                <BodyText style={styles.chipDuration}>{p.durationMin} min</BodyText>
                <BodyText style={styles.chipTitle} numberOfLines={1}>{p.title}</BodyText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.sm },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  primaryMeta: { fontSize: 15, fontWeight: "700", color: colors.primary },
  primaryDescription: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  beginButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  chipRow: { gap: spacing.sm, marginTop: spacing.sm, paddingRight: spacing.lg },
  chip: {
    minWidth: 96,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipDuration: { fontSize: 11, fontWeight: "800", color: colors.secondary },
  chipTitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
});
