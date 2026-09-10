import React, { useState } from "react";
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, BodyText, Button, LoadingView } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function BookConsultScreen() {
  const [date, setDate] = useState(ymd(new Date(Date.now() + 86_400_000)));
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading } = useResource(() => api.get<{ slots: string[] }>(`/api/therapy/slots?date=${date}`), [date]);
  const days = Array.from({ length: 10 }, (_, i) => new Date(Date.now() + (i + 1) * 86_400_000));

  const book = async () => {
    if (!slot) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/bookings", { date, slot });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not book your consultation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Free Consultation" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {done ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Heading size="md" style={{ textAlign: "center" }}>You&rsquo;re booked</Heading>
            <BodyText muted style={{ textAlign: "center", marginTop: spacing.sm }}>
              You&rsquo;ll get a reminder before your consultation. See it any time on the Home tab.
            </BodyText>
            <Button style={{ marginTop: spacing.lg }} onPress={() => router.replace("/(tabs)")}>Back to Home</Button>
          </View>
        ) : (
          <>
            <BodyText muted style={{ marginBottom: spacing.md }}>
              A free 1:1 call to see whether Yoga Therapy is right for you. One consultation per person.
            </BodyText>

            <Heading size="sm" style={{ marginBottom: spacing.sm }}>Choose a day</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {days.map((d) => {
                const k = ymd(d);
                return (
                  <Pressable key={k} onPress={() => { setDate(k); setSlot(null); }} style={[styles.day, date === k && styles.on]}>
                    <BodyText style={{ color: date === k ? colors.white : colors.text, fontSize: 12 }}>
                      {d.toLocaleDateString("en-IN", { weekday: "short" })}
                    </BodyText>
                    <BodyText style={{ color: date === k ? colors.white : colors.text, fontWeight: "700" }}>{d.getDate()}</BodyText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Heading size="sm" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Choose a time</Heading>
            {loading ? (
              <LoadingView />
            ) : (data?.slots ?? []).length === 0 ? (
              <BodyText muted>No slots available that day — try another.</BodyText>
            ) : (
              <View style={styles.slots}>
                {data!.slots.map((s) => (
                  <Pressable key={s} onPress={() => setSlot(s)} style={[styles.slot, slot === s && styles.on]}>
                    <BodyText style={{ color: slot === s ? colors.white : colors.text, fontSize: 13 }}>{s}</BodyText>
                  </Pressable>
                ))}
              </View>
            )}

            {err && <BodyText style={{ color: colors.danger, marginTop: spacing.md }}>{err}</BodyText>}

            <Button style={{ marginTop: spacing.lg }} loading={busy} disabled={!slot} onPress={book}>
              Book Consultation
            </Button>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, minWidth: 48 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  slot: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
});
