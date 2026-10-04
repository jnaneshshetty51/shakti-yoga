import React, { useMemo, useState } from "react";
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
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
  price: number | null;
  currency: string;
}

const KIND_LABEL: Record<Kind, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };
const KIND_ICON: Record<Kind, keyof typeof Ionicons.glyphMap> = {
  RETREAT: "leaf-outline",
  WORKSHOP: "school-outline",
  EVENT: "sparkles-outline",
};
const KIND_COLOR: Record<Kind, string> = {
  RETREAT: colors.primary,
  WORKSHOP: colors.secondary,
  EVENT: "#7C6BC4",
};
const FILTERS: { label: string; value: "all" | Kind }[] = [
  { label: "All", value: "all" },
  { label: "Retreats", value: "RETREAT" },
  { label: "Workshops", value: "WORKSHOP" },
  { label: "Events", value: "EVENT" },
];

function dateRange(start: string, end: string) {
  const s = new Date(start),
    e = new Date(end);
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const fullOpts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString("en-IN", fullOpts)
    : `${s.toLocaleDateString("en-IN", dayOpts)} – ${e.toLocaleDateString("en-IN", fullOpts)}`;
}

function daysUntil(dateStr: string): string {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default function EventsScreen() {
  const { data, loading, error } = useResource(
    () => api.get<{ retreats: Retreat[] }>("/api/retreats"),
    [],
  );
  const [filter, setFilter] = useState<"all" | Kind>("all");

  const rows = useMemo(
    () => (data?.retreats ?? []).filter((r) => filter === "all" || r.kind === filter),
    [data, filter],
  );

  const upcoming = rows.filter((r) => new Date(r.startDate) >= new Date());
  const past = rows.filter((r) => new Date(r.startDate) < new Date());

  return (
    <Screen>
      <ScreenHeader title="Workshops & Retreats" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load events" subtitle={error} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Filter chips */}
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, filter === f.value && styles.chipActive]}
              >
                <BodyText
                  style={{
                    color: filter === f.value ? colors.white : colors.muted,
                    fontSize: 13,
                    fontWeight: filter === f.value ? "700" : "400",
                  }}
                >
                  {f.label}
                </BodyText>
              </Pressable>
            ))}
          </View>

          {rows.length === 0 ? (
            <EmptyState title="Nothing scheduled" subtitle="Check back soon for upcoming events." />
          ) : (
            <>
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <>
                  <BodyText style={styles.sectionLabel}>UPCOMING</BodyText>
                  {upcoming.map((r) => (
                    <EventCard key={r.id} event={r} />
                  ))}
                </>
              )}

              {/* Past */}
              {past.length > 0 && (
                <>
                  <BodyText style={[styles.sectionLabel, { marginTop: spacing.lg }]}>PAST</BodyText>
                  {past.map((r) => (
                    <EventCard key={r.id} event={r} isPast />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function EventCard({ event, isPast }: { event: Retreat; isPast?: boolean }) {
  const kindColor = KIND_COLOR[event.kind];

  return (
    <Pressable
      onPress={() => router.push(`/events/${event.id}`)}
      style={({ pressed }) => pressed && { opacity: 0.9 }}
    >
      <Card style={[styles.eventCard, isPast && { opacity: 0.6 }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: kindColor }]} />

        <View style={styles.eventContent}>
          {/* Top row: kind + countdown */}
          <View style={styles.topRow}>
            <View style={styles.kindBadge}>
              <Ionicons name={KIND_ICON[event.kind]} size={14} color={kindColor} />
              <BodyText style={[styles.kindText, { color: kindColor }]}>
                {KIND_LABEL[event.kind]}
              </BodyText>
            </View>
            {!isPast && (
              <BodyText style={styles.countdown}>{daysUntil(event.startDate)}</BodyText>
            )}
          </View>

          {/* Name */}
          <BodyText style={styles.eventName}>{event.name}</BodyText>

          {/* Date */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <BodyText muted style={styles.metaText}>
              {dateRange(event.startDate, event.endDate)}
            </BodyText>
          </View>

          {/* Location */}
          {event.location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <BodyText muted style={styles.metaText}>{event.location}</BodyText>
            </View>
          )}

          {/* Price */}
          {event.price != null && (
            <View style={[styles.priceBadge, { borderColor: kindColor + "40", backgroundColor: kindColor + "0D" }]}>
              <BodyText style={[styles.priceText, { color: kindColor }]}>
                {event.currency === "USD" ? "$" : "₹"}
                {event.price.toLocaleString("en-IN")}
              </BodyText>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ alignSelf: "center" }} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  filters: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.lg, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  eventCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kindText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countdown: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
  },
  eventName: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
  },
  priceBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
