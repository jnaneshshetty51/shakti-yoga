import React, { useState } from "react";
import { View, TextInput, Modal, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={32}
            color={colors.secondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function TestimonialSubmitModal({ visible, onClose, onSubmitted }: Props) {
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setQuote("");
    setRating(5);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (quote.trim().length < 10) {
      Alert.alert("Too short", "Please write at least a few words about your experience.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/stories/submit", {
        quote: quote.trim(),
        rating,
      });
      setDone(true);
      onSubmitted();
    } catch (err) {
      Alert.alert(
        "Couldn't submit",
        err instanceof ApiError ? err.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Heading size="md" style={{ flex: 1 }}>Share Your Story</Heading>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {done ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="heart" size={48} color={colors.secondary} />
            </View>
            <Heading size="md" style={{ textAlign: "center", color: colors.primary }}>
              Thank you! 🌿
            </Heading>
            <BodyText muted style={{ textAlign: "center", marginTop: spacing.sm }}>
              Your testimonial has been submitted for review. It will appear on our Stories page once approved.
            </BodyText>
            <Button variant="outline" onPress={handleClose} style={{ marginTop: spacing.lg }}>
              Done
            </Button>
          </View>
        ) : (
          <View style={styles.form}>
            <BodyText muted style={styles.hint}>
              Your story inspires others on their yoga journey. Share what Shakti Yoga means to you.
            </BodyText>

            {/* Star rating */}
            <BodyText style={styles.label}>YOUR RATING</BodyText>
            <StarPicker value={rating} onChange={setRating} />

            {/* Quote */}
            <BodyText style={styles.label}>YOUR EXPERIENCE</BodyText>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={quote}
              onChangeText={setQuote}
              placeholder="What has your experience with Shakti Yoga been like?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
            />
            <BodyText muted style={styles.charCount}>
              {quote.length}/2000
            </BodyText>

            <Button
              onPress={submit}
              loading={loading}
              disabled={quote.trim().length < 10}
              style={{ marginTop: spacing.md }}
            >
              Submit Story
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    padding: spacing.lg,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
});
