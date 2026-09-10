import React, { useState } from "react";
import { ScrollView, View, TextInput, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

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

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useResource(
    () => api.get<{ retreat: Retreat }>(`/api/retreats/${id}`),
    [id],
  );
  const retreat = data?.retreat;

  const [form, setForm] = useState({ name: "", email: "", phone: "", participantsCount: "1", message: "" });
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
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Heading size="lg">{retreat.name}</Heading>
          <BodyText muted style={{ marginTop: spacing.xs }}>
            {new Date(retreat.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {" – "}
            {new Date(retreat.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </BodyText>
          {retreat.location && <BodyText muted>{retreat.location}</BodyText>}
          {retreat.price != null && (
            <View style={{ marginTop: spacing.sm }}>
              <Badge tone="success">
                {retreat.currency === "USD" ? "$" : "₹"}
                {retreat.price.toLocaleString("en-IN")}
              </Badge>
            </View>
          )}
          {retreat.description && (
            <BodyText style={{ marginTop: spacing.md }}>{retreat.description}</BodyText>
          )}

          <Card style={{ marginTop: spacing.lg }}>
            <BodyText style={{ fontWeight: "700", marginBottom: spacing.sm }}>Enquire</BodyText>
            {done ? (
              <BodyText muted>Thanks — we'll be in touch with confirmation and payment details.</BodyText>
            ) : (
              <>
                {formError && <BodyText style={{ color: colors.danger, marginBottom: spacing.sm }}>{formError}</BodyText>}
                <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted}
                  value={form.name} onChangeText={(v) => set("name", v)} />
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.muted}
                  autoCapitalize="none" keyboardType="email-address"
                  value={form.email} onChangeText={(v) => set("email", v)} />
                <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor={colors.muted}
                  keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set("phone", v)} />
                <TextInput style={styles.input} placeholder="Participants" placeholderTextColor={colors.muted}
                  keyboardType="number-pad" value={form.participantsCount} onChangeText={(v) => set("participantsCount", v)} />
                <TextInput style={[styles.input, styles.multiline]} placeholder="Anything we should know?"
                  placeholderTextColor={colors.muted} multiline
                  value={form.message} onChangeText={(v) => set("message", v)} />
                <Button loading={busy} disabled={!form.name.trim() || !form.email.trim()} onPress={submit}>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
