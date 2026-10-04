import React, { useState } from "react";
import { ScrollView, View, TextInput, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";

type Kind = "RETREAT" | "WORKSHOP" | "EVENT";
interface Retreat {
  id: string;
  kind: Kind;
  name: string;
  location: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  price: number | null;
  currency: string;
}
const KIND_LABEL: Record<Kind, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };
const KIND_COLOR: Record<Kind, string> = {
  RETREAT: colors.primary,
  WORKSHOP: colors.secondary,
  EVENT: "#7C6BC4",
};

function dateRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString("en-IN", opts)
    : `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading, error } = useResource(
    () => api.get<{ retreat: Retreat }>(`/api/retreats/${id}`),
    [id],
  );
  const retreat = data?.retreat;
  const kindColor = retreat ? KIND_COLOR[retreat.kind] : colors.primary;

  // Pre-fill from logged-in user
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    participantsCount: "1",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await api.post(`/api/retreats/${id}/enquire`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        participantsCount: Number(form.participantsCount) || 1,
        message: form.message.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not send your enquiry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={retreat ? KIND_LABEL[retreat.kind] : "Details"} />
      {loading ? (
        <LoadingView />
      ) : error || !retreat ? (
        <EmptyState title="Not found" subtitle={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ─── Hero section ──────────────────────────────────── */}
          <View style={[styles.hero, { borderLeftColor: kindColor }]}>
            {/* Kind badge */}
            <View style={[styles.kindBadge, { backgroundColor: kindColor + "1A" }]}>
              <BodyText style={[styles.kindText, { color: kindColor }]}>
                {KIND_LABEL[retreat.kind]}
              </BodyText>
            </View>

            {/* Title */}
            <Heading size="lg" style={styles.heroTitle}>
              {retreat.name}
            </Heading>

            {/* Date */}
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <BodyText style={styles.metaText}>
                {dateRange(retreat.startDate, retreat.endDate)}
              </BodyText>
            </View>

            {/* Location */}
            {retreat.location && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <BodyText style={styles.metaText}>{retreat.location}</BodyText>
              </View>
            )}

            {/* Price */}
            {retreat.price != null && (
              <View style={[styles.priceCard, { borderColor: kindColor + "40" }]}>
                <BodyText muted style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>
                  STARTING FROM
                </BodyText>
                <Heading size="lg" style={{ color: kindColor, marginTop: 2 }}>
                  {retreat.currency === "USD" ? "$" : "₹"}
                  {retreat.price.toLocaleString("en-IN")}
                </Heading>
              </View>
            )}
          </View>

          {/* ─── Description ───────────────────────────────────── */}
          {retreat.description && (
            <Card style={styles.descCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <BodyText style={styles.sectionTitle}>About This {KIND_LABEL[retreat.kind]}</BodyText>
              </View>
              <BodyText style={styles.description}>{retreat.description}</BodyText>
            </Card>
          )}

          {/* ─── Enquiry form ──────────────────────────────────── */}
          <Card style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <BodyText style={styles.sectionTitle}>Register Your Interest</BodyText>
            </View>

            {done ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                </View>
                <Heading size="sm" style={{ textAlign: "center", color: colors.primary }}>
                  Enquiry sent!
                </Heading>
                <BodyText muted style={{ textAlign: "center", marginTop: spacing.xs }}>
                  We'll be in touch with confirmation and payment details. You can also reach us on WhatsApp.
                </BodyText>
              </View>
            ) : (
              <>
                <BodyText muted style={styles.formHint}>
                  Submit your details and we'll follow up with availability and payment options.
                </BodyText>

                {formError && (
                  <BodyText style={styles.formError}>{formError}</BodyText>
                )}

                <BodyText style={styles.fieldLabel}>Your Name</BodyText>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  value={form.name}
                  onChangeText={(v) => set("name", v)}
                />

                <BodyText style={styles.fieldLabel}>Email</BodyText>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(v) => set("email", v)}
                />

                <BodyText style={styles.fieldLabel}>Phone (optional)</BodyText>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(v) => set("phone", v)}
                />

                <BodyText style={styles.fieldLabel}>Number of Participants</BodyText>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  value={form.participantsCount}
                  onChangeText={(v) => set("participantsCount", v)}
                />

                <BodyText style={styles.fieldLabel}>Message (optional)</BodyText>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Any questions, dietary needs, or special requests?"
                  placeholderTextColor={colors.muted}
                  multiline
                  value={form.message}
                  onChangeText={(v) => set("message", v)}
                />

                <Button
                  loading={busy}
                  disabled={!form.name.trim() || !form.email.trim()}
                  onPress={submit}
                  style={{ marginTop: spacing.sm }}
                >
                  Send Enquiry
                </Button>
              </>
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  kindBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  kindText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  priceCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  descCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formHint: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
  multiline: { minHeight: 80, textAlignVertical: "top" },
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
});
