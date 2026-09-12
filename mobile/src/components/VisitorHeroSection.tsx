import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText, Button, Badge } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

export function VisitorHeroSection() {
  return (
    <View style={styles.container}>
      {/* Brand Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="flower-outline" size={22} color={colors.secondary} />
          </View>
          <Badge tone="success">TRADITION &amp; SCIENCE</Badge>
        </View>

        <Heading size="lg" style={styles.heroTitle}>
          Find stillness in motion. Guided live from India.
        </Heading>

        <BodyText muted style={styles.heroSubtitle}>
          Live daily yoga batches and personalized 1:1 yoga therapy. Experienced by practitioners across 14+ countries.
        </BodyText>

        <View style={styles.trialCard}>
          <View style={styles.trialBadgeRow}>
            <Ionicons name="gift-outline" size={16} color={colors.secondary} />
            <BodyText style={styles.trialBadgeText}>COMPLIMENTARY PASS</BodyText>
          </View>
          <Heading size="sm" style={styles.trialTitle}>
            Experience your first live class on us
          </Heading>
          <BodyText muted style={styles.trialDesc}>
            Join our live interactive Google Meet batches. No payment required.
          </BodyText>
          <Button
            style={{ marginTop: spacing.md }}
            onPress={() => router.push("/(auth)/signup")}
          >
            Claim Free Trial Class
          </Button>
        </View>
      </Card>

      {/* Pathways: Everyday Yoga & Yoga Therapy */}
      <View style={styles.pathwaysSection}>
        <Heading size="sm" style={styles.sectionHeading}>
          Two Pathways to Transformation
        </Heading>

        {/* Pathway 1: Everyday Yoga */}
        <Pressable
          onPress={() => router.push("/info/everyday")}
          style={({ pressed }) => [styles.pathwayCard, pressed && { opacity: 0.9 }]}
        >
          <Card style={styles.innerPathwayCard}>
            <View style={styles.pathwayIconRow}>
              <View style={[styles.pathwayIconCircle, { backgroundColor: colors.sage }]}>
                <Ionicons name="sunny-outline" size={20} color={colors.primary} />
              </View>
              <Badge tone="neutral">DAILY GROUP BATCHES</Badge>
            </View>
            <Heading size="md" style={styles.pathwayTitle}>
              Everyday Yoga
            </Heading>
            <BodyText muted style={styles.pathwayDesc}>
              5 daily live batches matching your global timezone. Deep asana practice, pranayama, and mindful meditation.
            </BodyText>
            <View style={styles.linkActionRow}>
              <BodyText style={styles.linkActionText}>Learn more &amp; view timetable</BodyText>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </Card>
        </Pressable>

        {/* Pathway 2: Yoga Therapy */}
        <Pressable
          onPress={() => router.push("/info/therapy")}
          style={({ pressed }) => [styles.pathwayCard, pressed && { opacity: 0.9 }]}
        >
          <Card style={styles.innerPathwayCard}>
            <View style={styles.pathwayIconRow}>
              <View style={[styles.pathwayIconCircle, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="heart-outline" size={20} color={colors.secondary} />
              </View>
              <Badge tone="warning">1:1 CLINICAL CARE</Badge>
            </View>
            <Heading size="md" style={styles.pathwayTitle}>
              Yoga Therapy
            </Heading>
            <BodyText muted style={styles.pathwayDesc}>
              Targeted 1-on-1 therapy for chronic pain, spinal alignment, PCOS/PCOD, hypertension, and stress recovery.
            </BodyText>
            <View style={styles.linkActionRow}>
              <BodyText style={styles.linkActionText}>Begin personalized assessment</BodyText>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </Card>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  trialCard: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trialBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  trialTitle: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  trialDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  pathwaysSection: {
    gap: spacing.md,
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },
  pathwayCard: {
    marginBottom: spacing.xs,
  },
  innerPathwayCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  pathwayIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  pathwayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayTitle: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 4,
  },
  pathwayDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  linkActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  linkActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
