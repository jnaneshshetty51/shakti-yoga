import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, BodyText, Button, Badge } from "@/components/ui";
import { timeUntil, formatClassTime } from "@/lib/format";
import { colors, spacing, radius, shadows } from "@/theme";
import type { ClassView, HomeTherapyNext } from "@/lib/types";

interface HeroClassCardProps {
  nextClass?: ClassView | null;
  nextTherapy?: HomeTherapyNext | null;
  isTrial?: boolean;
  joiningId?: string | null;
  onJoinClass?: (id: string) => void;
  onJoinTherapy?: (id: string) => void;
  restTodayCount?: number;
}

export function HeroClassCard({
  nextClass,
  nextTherapy,
  isTrial = false,
  joiningId,
  onJoinClass,
  onJoinTherapy,
  restTodayCount = 0,
}: HeroClassCardProps) {
  // Therapy 1:1 Session View
  if (nextTherapy) {
    const isJoinable = nextTherapy.joinable;
    const sessionType =
      nextTherapy.type === "CONSULTATION"
        ? "Personal Intake & Consultation"
        : "1:1 Yoga Therapy Session";

    return (
      <Card style={styles.heroCard}>
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.pulseDot, isJoinable && styles.pulseDotLive]} />
            <BodyText style={[styles.eyebrow, isJoinable && styles.eyebrowLive]}>
              {isJoinable ? "SESSION OPEN NOW" : "UPCOMING 1:1 SESSION"}
            </BodyText>
          </View>
          <Badge tone={isJoinable ? "success" : "neutral"}>
            {timeUntil(nextTherapy.date)}
          </Badge>
        </View>

        <Heading size="md" style={styles.classTitle}>
          {sessionType}
        </Heading>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={15} color={colors.secondary} />
            <BodyText style={styles.metaText}>{nextTherapy.teacher}</BodyText>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={colors.secondary} />
            <BodyText style={styles.metaText}>{formatClassTime(nextTherapy.date)}</BodyText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            style={styles.mainButton}
            disabled={!isJoinable}
            loading={joiningId === nextTherapy.id}
            onPress={() => onJoinTherapy?.(nextTherapy.id)}
          >
            {isJoinable ? "Join Therapy Room" : "Opens 15 min before"}
          </Button>
          <Pressable
            onPress={() => router.push("/therapy")}
            style={({ pressed }) => [styles.secondaryIconBtn, pressed && { opacity: 0.7 }]}
            accessibilityLabel="View therapy notes"
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </Card>
    );
  }

  // Group Class View (Everyday / Trial)
  if (nextClass) {
    const isJoinable = nextClass.joinable;

    return (
      <Card style={styles.heroCard}>
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.pulseDot, isJoinable && styles.pulseDotLive]} />
            <BodyText style={[styles.eyebrow, isJoinable && styles.eyebrowLive]}>
              {isJoinable
                ? "LIVE NOW"
                : isTrial
                ? "YOUR FREE TRIAL BATCH"
                : "NEXT UPCOMING BATCH"}
            </BodyText>
          </View>
          <Badge tone={isJoinable ? "success" : "neutral"}>
            {timeUntil(nextClass.startsAt)}
          </Badge>
        </View>

        <Heading size="md" style={styles.classTitle}>
          {nextClass.batchName}
        </Heading>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={15} color={colors.secondary} />
            <BodyText style={styles.metaText}>{nextClass.teacher}</BodyText>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={colors.secondary} />
            <BodyText style={styles.metaText}>{formatClassTime(nextClass.startsAt)}</BodyText>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="videocam-outline" size={15} color={colors.secondary} />
            <BodyText style={styles.metaText}>Live (Meet)</BodyText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            style={styles.mainButton}
            disabled={!isJoinable}
            loading={joiningId === nextClass.id}
            onPress={() => onJoinClass?.(nextClass.id)}
          >
            {isJoinable ? "Join Live Class" : "Opens 30 min before"}
          </Button>
          <Pressable
            onPress={() => router.push("/calendar")}
            style={({ pressed }) => [styles.secondaryIconBtn, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Add to device calendar"
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {restTodayCount > 0 && (
          <Pressable
            onPress={() => router.push("/(tabs)/classes")}
            style={({ pressed }) => [styles.footerNotice, pressed && { opacity: 0.7 }]}
          >
            <BodyText style={styles.footerNoticeText}>
              + {restTodayCount} more {restTodayCount === 1 ? "batch" : "batches"} available today
            </BodyText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}
      </Card>
    );
  }

  // Rest & Serene State: When no more classes remain today
  return (
    <Card style={[styles.heroCard, styles.restCard]}>
      <View style={styles.restIconCircle}>
        <Ionicons name="moon-outline" size={24} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <BodyText style={styles.eyebrow}>EVENING REST & RESTORATION</BodyText>
        <Heading size="sm" style={styles.restTitle}>
          Your practice for today is complete
        </Heading>
        <BodyText muted style={styles.restDescription}>
          Rest deeply tonight to restore vitality. Tomorrow&apos;s morning batches resume at 6:00 AM IST.
        </BodyText>
        <View style={styles.restBtnRow}>
          <Pressable
            onPress={() => router.push("/(tabs)/classes")}
            style={({ pressed }) => [styles.restButton, pressed && { opacity: 0.8 }]}
          >
            <BodyText style={styles.restButtonText}>View Tomorrow&apos;s Timetable</BodyText>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  pulseDotLive: {
    backgroundColor: "#10B981",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  eyebrowLive: {
    color: "#059669",
  },
  classTitle: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mainButton: {
    flex: 1,
  },
  secondaryIconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  restCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderColor: colors.border,
  },
  restIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  restTitle: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 2,
  },
  restDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  restBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  restButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  restButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
