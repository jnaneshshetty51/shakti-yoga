import React from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Button } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

interface AchievementModalProps {
  visible: boolean;
  achievements: { title?: string; name?: string; description?: string }[];
  onClose: () => void;
}

export function AchievementModal({ visible, achievements, onClose }: AchievementModalProps) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={44} color={colors.secondary} />
          </View>

          <Heading size="md" style={styles.heading}>
            Achievement Unlocked!
          </Heading>
          <BodyText muted style={styles.subheading}>
            Your dedication to daily yoga practice continues to bear fruit.
          </BodyText>

          <View style={styles.badgeList}>
            {achievements.map((item, idx) => (
              <View key={idx} style={styles.badgeItem}>
                <View style={styles.sparkleIcon}>
                  <Ionicons name="sparkles" size={18} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <BodyText style={styles.badgeTitle}>{item.title || item.name}</BodyText>
                  {item.description ? (
                    <BodyText muted style={styles.badgeDesc}>{item.description}</BodyText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <Button variant="primary" onPress={onClose} style={styles.actionBtn}>
            Celebrate & Continue
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heading: {
    textAlign: "center",
  },
  subheading: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  badgeList: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.text,
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    width: "100%",
  },
});
