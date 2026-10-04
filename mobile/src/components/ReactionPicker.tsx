import React from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadows } from "@/theme";

export const ALLOWED_REACTIONS = ["❤️", "🙏", "🌸", "🔥", "👏"] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

export const REACTION_LABELS: Record<AllowedReaction, string> = {
  "❤️": "Love",
  "🙏": "Namaste",
  "🌸": "Lotus",
  "🔥": "Tapas",
  "👏": "Bravo",
};

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (reaction: AllowedReaction) => void;
  currentReaction?: string | null;
}

export function ReactionPickerModal({ visible, onClose, onSelect, currentReaction }: ReactionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.pickerBubble}>
          {ALLOWED_REACTIONS.map((rx) => {
            const isSelected = currentReaction === rx;
            return (
              <Pressable
                key={rx}
                onPress={() => {
                  onSelect(rx);
                  onClose();
                }}
                style={[styles.reactionBtn, isSelected && styles.reactionBtnSelected]}
                hitSlop={6}
              >
                <Text style={styles.reactionEmoji}>{rx}</Text>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

interface ReactionPillsProps {
  reactions?: Record<string, number>;
  userReaction?: string | null;
  likeCount?: number;
  onToggleReaction: (rx?: AllowedReaction) => void;
  onOpenPicker: () => void;
}

export function ReactionPills({
  reactions = {},
  userReaction,
  likeCount = 0,
  onToggleReaction,
  onOpenPicker,
}: ReactionPillsProps) {
  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
  const hasReacted = Boolean(userReaction);

  return (
    <View style={styles.pillsContainer}>
      {/* Quick Like / React Action Button */}
      <Pressable
        onPress={() => onToggleReaction(userReaction as AllowedReaction || "❤️")}
        onLongPress={onOpenPicker}
        style={[styles.mainActionBtn, hasReacted && styles.mainActionBtnActive]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={hasReacted ? "Unlike" : "React"}
      >
        <Ionicons
          name={hasReacted ? "heart" : "heart-outline"}
          size={16}
          color={hasReacted ? colors.danger : colors.muted}
        />
        <Text style={[styles.mainActionText, hasReacted && styles.mainActionTextActive]}>
          {userReaction ? userReaction : "React"}
        </Text>
      </Pressable>

      {/* Choose reaction popover opener */}
      <Pressable onPress={onOpenPicker} style={styles.addReactionBtn} hitSlop={6}>
        <Ionicons name="add-circle-outline" size={16} color={colors.muted} />
      </Pressable>

      {/* Aggregate Reaction Pills */}
      {reactionEntries.map(([rx, count]) => {
        const isMyPick = userReaction === rx;
        return (
          <Pressable
            key={rx}
            onPress={() => onToggleReaction(rx as AllowedReaction)}
            style={[styles.pill, isMyPick && styles.pillActive]}
          >
            <Text style={styles.pillEmoji}>{rx}</Text>
            <Text style={[styles.pillCount, isMyPick && styles.pillCountActive]}>{count}</Text>
          </Pressable>
        );
      })}

      {reactionEntries.length === 0 && likeCount > 0 && (
        <View style={styles.pill}>
          <Text style={styles.pillEmoji}>❤️</Text>
          <Text style={styles.pillCount}>{likeCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerBubble: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.sm,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reactionBtn: {
    padding: spacing.xs,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionBtnSelected: {
    backgroundColor: colors.secondaryLight,
    transform: [{ scale: 1.15 }],
  },
  reactionEmoji: {
    fontSize: 28,
  },
  pillsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  mainActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  mainActionBtnActive: {
    backgroundColor: colors.dangerLight,
  },
  mainActionText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  mainActionTextActive: {
    color: colors.danger,
    fontWeight: "700",
  },
  addReactionBtn: {
    padding: 4,
    borderRadius: radius.pill,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillActive: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary,
  },
  pillEmoji: {
    fontSize: 12,
  },
  pillCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.sageText,
  },
  pillCountActive: {
    color: colors.secondary,
    fontWeight: "700",
  },
});
