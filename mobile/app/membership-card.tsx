import React, { useCallback, useRef, useState } from "react";
import { View, Image, StyleSheet, Alert, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QRCode } from "@/components/QRCode";
import { useAuth } from "@/context/AuthContext";
import { api, appendImageFile } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";

interface BillingResponse {
  subscription: {
    planType: string;
    status: string;
    renewalDate: string;
    currentCycleStart: string | null;
  } | null;
}

const PLAN_LABEL: Record<string, string> = {
  EVERYDAY_YOGA: "Everyday Yoga",
  YOGA_THERAPY: "Yoga Therapy",
  STARTER: "Starter",
  FAMILY: "Family",
  TRIAL: "Complimentary Pass",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "#10B981" },
  TRIAL: { label: "Trial", color: colors.secondary },
  EXPIRED: { label: "Expired", color: colors.danger },
  PAUSED: { label: "Paused", color: colors.muted },
};

const logo = require("../assets/splash.png");

export default function MembershipCardScreen() {
  const { user, refreshUser } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => api.get<BillingResponse>("/api/billing"),
    []
  );
  const sub = data?.subscription;
  const cardRef = useRef<View>(null);
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      await appendImageFile(formData, "file", asset.uri, asset.mimeType, "avatar.jpg");

      await api.upload("/api/profile/avatar", formData);

      await refreshUser();
      Alert.alert("Photo updated", "Your membership card has been updated.");
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  }, [refreshUser]);

  const shareCard = useCallback(async () => {
    if (!user) return;
    const plan = sub ? (PLAN_LABEL[sub.planType] ?? sub.planType) : "Guest";
    const text = `🧘 Shakti Yoga Kendra\n\n${user.name}\n${plan} member\n\nMember ID: ${user.id}`;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        "Card info copied",
        "Your membership details have been copied. You can also take a screenshot of the card to share it."
      );
    } catch {
      Alert.alert(
        "Tip",
        "Take a screenshot of your membership card to share it."
      );
    }
  }, [user, sub]);

  const initials = React.useMemo(() => {
    if (!user?.name) return "SY";
    const parts = user.name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  const memberSince = React.useMemo(() => {
    if (!sub?.currentCycleStart) return null;
    return new Date(sub.currentCycleStart).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }, [sub]);

  const cycleEnds = React.useMemo(() => {
    if (!sub?.renewalDate) return null;
    return new Date(sub.renewalDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [sub]);

  const statusInfo = STATUS_LABEL[sub?.status ?? ""] ?? {
    label: sub?.status ?? "Guest",
    color: colors.muted,
  };

  return (
    <Screen>
      <ScreenHeader title="Membership Card" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState
          title="Couldn't load your card"
          subtitle={error}
          onRetry={reload}
        />
      ) : (
        <View style={{ padding: spacing.lg, flex: 1 }}>
          {/* ─── The Card ───────────────────────────────────────── */}
          <View ref={cardRef} collapsable={false} style={styles.cardOuter}>
            {/* Top gradient band */}
            <View style={styles.topBand}>
              <Image source={logo} style={styles.cardLogo} resizeMode="contain" />
              <BodyText style={styles.brandText}>SHAKTI YOGA KENDRA</BodyText>
            </View>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Pressable onPress={uploadAvatar} style={styles.avatarPressable}>
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <BodyText style={styles.initialsText}>{initials}</BodyText>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color={colors.white} />
                </View>
              </Pressable>
            </View>

            {/* Member info */}
            <Heading size="md" style={styles.memberName}>
              {user?.name}
            </Heading>
            <BodyText style={styles.planName}>
              {sub
                ? PLAN_LABEL[sub.planType] ?? sub.planType
                : "Guest"}
            </BodyText>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "1A" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <BodyText style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </BodyText>
            </View>

            {/* QR Code */}
            {user && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={user.id}
                  size={140}
                  color={colors.primary}
                  backgroundColor={colors.white}
                />
                <BodyText muted style={styles.qrHint}>
                  Scan for check-in
                </BodyText>
              </View>
            )}

            {/* Footer details */}
            {sub && (
              <View style={styles.footer}>
                {memberSince && (
                  <View style={styles.footerItem}>
                    <BodyText style={styles.footerLabel}>MEMBER SINCE</BodyText>
                    <BodyText style={styles.footerValue}>{memberSince}</BodyText>
                  </View>
                )}
                {cycleEnds && (
                  <View style={styles.footerItem}>
                    <BodyText style={styles.footerLabel}>CYCLE ENDS</BodyText>
                    <BodyText style={styles.footerValue}>{cycleEnds}</BodyText>
                  </View>
                )}
              </View>
            )}

            {/* Decorative bottom accent */}
            <View style={styles.bottomAccent} />
          </View>

          {/* ─── Actions ────────────────────────────────────────── */}
          <View style={styles.actions}>
            <Button
              variant="outline"
              onPress={shareCard}
              style={{ flex: 1 }}
            >
              Share Card
            </Button>
            <Button
              variant="outline"
              onPress={uploadAvatar}
              loading={uploading}
              style={{ flex: 1 }}
            >
              {user?.avatarUrl ? "Change Photo" : "Add Photo"}
            </Button>
          </View>

          <BodyText muted style={styles.note}>
            Show this card to your teacher for in-studio check-in.
          </BodyText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    backgroundColor: colors.surface,
    borderRadius: radius.card + 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
    alignItems: "center",
  },
  topBand: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  cardLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  brandText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  avatarContainer: {
    marginTop: -28,
    marginBottom: spacing.sm,
  },
  avatarPressable: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  memberName: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "700",
  },
  planName: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  qrContainer: {
    marginTop: spacing.md,
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  qrHint: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "stretch",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  footerItem: {
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  bottomAccent: {
    width: "100%",
    height: 4,
    backgroundColor: colors.secondary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  note: {
    textAlign: "center",
    fontSize: 12,
    marginTop: spacing.md,
  },
});
