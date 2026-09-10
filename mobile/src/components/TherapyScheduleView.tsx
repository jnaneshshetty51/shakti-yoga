import React, { useCallback, useState } from "react";
import { ScrollView, View, Pressable, Modal, StyleSheet, Alert } from "react-native";
import { Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { formatClassTime } from "@/lib/format";
import { colors, spacing, radius } from "@/theme";
import type { BookingRow } from "@/lib/types";

const STATUS_TONE: Record<BookingRow["status"], "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function within24h(iso: string) {
  return new Date(iso).getTime() - Date.now() < 24 * 3600_000;
}

function RescheduleModal({ booking, onClose, onDone }: { booking: BookingRow; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState<string>(ymd(new Date(Date.now() + 2 * 86_400_000)));
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: slotData, loading: slotsLoading } = useResource(
    () => api.get<{ slots: string[] }>(`/api/therapy/slots?date=${date}`),
    [date],
  );
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() + (i + 1) * 86_400_000));

  const submit = async () => {
    if (!slot) return;
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/api/bookings/${booking.id}`, { date, slot });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not reschedule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Heading size="sm">Reschedule session</Heading>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.sm }}>
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

          {slotsLoading ? (
            <BodyText muted>Loading slots…</BodyText>
          ) : (slotData?.slots ?? []).length === 0 ? (
            <BodyText muted>No slots available that day.</BodyText>
          ) : (
            <View style={styles.slots}>
              {slotData!.slots.map((s) => (
                <Pressable key={s} onPress={() => setSlot(s)} style={[styles.slot, slot === s && styles.on]}>
                  <BodyText style={{ color: slot === s ? colors.white : colors.text, fontSize: 13 }}>{s}</BodyText>
                </Pressable>
              ))}
            </View>
          )}

          {err && <BodyText style={{ color: colors.danger, marginTop: spacing.sm }}>{err}</BodyText>}

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Button variant="ghost" onPress={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button loading={busy} disabled={!slot} onPress={submit} style={{ flex: 1 }}>Confirm</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The My-Therapy-Schedule body, without a page header — used by the tab and the pushed route. */
export function TherapyScheduleView() {
  const { data, loading, error, reload } = useResource(() => api.get<{ bookings: BookingRow[] }>("/api/bookings"), []);
  const { joiningId, joinBooking } = useJoin();
  const [rescheduling, setRescheduling] = useState<BookingRow | null>(null);

  const cancel = useCallback((b: BookingRow) => {
    Alert.alert("Cancel this session?", "Your session credit is restored.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel session",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await api.del<{ creditsRestored: number }>(`/api/bookings/${b.id}`);
            Alert.alert("Cancelled", res.creditsRestored > 0 ? `${res.creditsRestored} credit restored.` : "Session cancelled.");
            reload();
          } catch (e) {
            Alert.alert("Couldn't cancel", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  }, [reload]);

  if (loading) return <LoadingView />;
  if (error) return <EmptyState title="Couldn't load your sessions" subtitle={error} />;

  const now = Date.now(); // eslint-disable-line react-hooks/purity -- split upcoming/past by wall clock
  const all = (data?.bookings ?? []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = all.filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > now - 3600_000);
  const past = all.filter((b) => !upcoming.includes(b)).reverse();

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <BodyText muted style={{ marginBottom: spacing.md }}>
          Your sessions are scheduled by the Shakti team. Reschedule or cancel below.
        </BodyText>

        <Heading size="sm" style={{ marginBottom: spacing.sm }}>Upcoming</Heading>
        {upcoming.length === 0 ? (
          <BodyText muted style={{ marginBottom: spacing.lg }}>No upcoming sessions.</BodyText>
        ) : (
          upcoming.map((b) => (
            <Card key={b.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.rowBetween}>
                <BodyText style={{ fontWeight: "700" }}>
                  {new Date(b.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {formatClassTime(b.date)}
                </BodyText>
                <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
              </View>
              <BodyText muted style={{ marginTop: 2 }}>{b.teacher}</BodyText>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" }}>
                <Button loading={joiningId === b.id} onPress={() => joinBooking(b.id)}>Join</Button>
                <Button variant="outline" onPress={() => (within24h(b.date) ? Alert.alert("Too close", "Sessions can only be rescheduled at least 24 hours in advance.") : setRescheduling(b))}>
                  Reschedule
                </Button>
                <Button variant="ghost" onPress={() => cancel(b)}>Cancel</Button>
              </View>
            </Card>
          ))
        )}

        {past.length > 0 && (
          <>
            <Heading size="sm" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Past</Heading>
            {past.map((b) => (
              <Card key={b.id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.rowBetween}>
                  <BodyText>{new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</BodyText>
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                </View>
                {b.notes && <BodyText muted style={{ marginTop: spacing.xs, fontSize: 13 }}>{b.notes}</BodyText>}
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {rescheduling && (
        <RescheduleModal
          booking={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => { setRescheduling(null); reload(); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backdrop: { flex: 1, backgroundColor: "#0006", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, maxHeight: "80%" },
  day: { alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, minWidth: 48 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  slot: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
});
