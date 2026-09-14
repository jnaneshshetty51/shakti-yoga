import React, { useMemo } from "react";
import { ScrollView, View, Pressable, StyleSheet, Alert, Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, Heading, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { formatClassTime } from "@/lib/format";
import { colors, spacing } from "@/theme";
import type { ClassesResponse, BookingRow } from "@/lib/types";

type Kind = "class" | "session" | "event";
interface Entry {
  id: string;
  kind: Kind;
  title: string;
  start: string;
  end: string;
}

const KIND_META: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  class: { icon: "people-outline", label: "Class" },
  session: { icon: "medkit-outline", label: "Therapy" },
  event: { icon: "sparkles-outline", label: "Event" },
};

async function addToDevice(e: Entry) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Allow calendar access in Settings to add events.");
    return;
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const target =
    (Platform.OS === "ios"
      ? (await Calendar.getDefaultCalendarAsync())
      : cals.find((c) => c.allowsModifications)) ?? cals[0];
  if (!target) {
    Alert.alert("No calendar", "Couldn't find a writable calendar on this device.");
    return;
  }
  await Calendar.createEventAsync(target.id, {
    title: `Shakti — ${e.title}`,
    startDate: new Date(e.start),
    endDate: new Date(e.end),
    notes: KIND_META[e.kind].label,
  });
  Alert.alert("Added", "Event saved to your calendar.");
}

export default function CalendarScreen() {
  const classes = useResource(() => api.get<ClassesResponse>("/api/classes"), []);
  const bookings = useResource(() => api.get<{ bookings: BookingRow[] }>("/api/bookings"), []);
  const retreats = useResource(
    () => api.get<{ retreats: { id: string; name: string; startDate: string; endDate: string }[] }>("/api/retreats"),
    [],
  );

  const loading = classes.loading || bookings.loading || retreats.loading;
  // A real fetch failure used to be swallowed into "nothing scheduled" — now
  // surfaced distinctly so it doesn't look like an empty calendar.
  const error = classes.error || bookings.error || retreats.error;

  const byDay = useMemo(() => {
    const entries: Entry[] = [];
    const cls = classes.data;
    if (cls?.today) {
      [...cls.today, ...cls.upcoming].forEach((c) =>
        entries.push({ id: `c-${c.id}`, kind: "class", title: c.batchName, start: c.startsAt, end: c.endsAt }),
      );
    }
    // eslint-disable-next-line react-hooks/purity -- agenda shows sessions from ~now forward
    const cutoff = Date.now() - 3_600_000;
    bookings.data?.bookings
      ?.filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > cutoff)
      .forEach((b) =>
        entries.push({ id: `b-${b.id}`, kind: "session", title: "Yoga Therapy session", start: b.date, end: new Date(new Date(b.date).getTime() + 45 * 60_000).toISOString() }),
      );
    retreats.data?.retreats?.forEach((r) =>
      entries.push({ id: `r-${r.id}`, kind: "event", title: r.name, start: r.startDate, end: r.endDate }),
    );

    entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const groups: { day: string; label: string; items: Entry[] }[] = [];
    for (const e of entries) {
      const day = new Date(e.start).toDateString();
      let g = groups.find((x) => x.day === day);
      if (!g) {
        g = { day, label: new Date(e.start).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }), items: [] };
        groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }, [classes.data, bookings.data, retreats.data]);

  return (
    <Screen>
      <ScreenHeader title="Calendar" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load your calendar" subtitle={error} />
      ) : byDay.length === 0 ? (
        <EmptyState title="Nothing scheduled" subtitle="Your classes, therapy sessions and events show here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {byDay.map((g) => (
            <View key={g.day} style={{ marginBottom: spacing.lg }}>
              <Heading size="sm" style={{ marginBottom: spacing.sm }}>{g.label}</Heading>
              {g.items.map((e) => (
                <Card key={e.id} style={styles.row}>
                  <Ionicons name={KIND_META[e.kind].icon} size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <BodyText style={{ fontWeight: "700" }}>{e.title}</BodyText>
                    <BodyText muted style={{ fontSize: 12 }}>{formatClassTime(e.start)} · {KIND_META[e.kind].label}</BodyText>
                  </View>
                  <Pressable onPress={() => addToDevice(e)} hitSlop={8}>
                    <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                  </Pressable>
                </Card>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
});
