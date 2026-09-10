import React, { useMemo, useState } from "react";
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, BodyText, Card, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing } from "@/theme";

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
const FILTERS: { label: string; value: "all" | Kind }[] = [
  { label: "All", value: "all" },
  { label: "Retreats", value: "RETREAT" },
  { label: "Workshops", value: "WORKSHOP" },
  { label: "Events", value: "EVENT" },
];

function dateRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString("en-IN", opts)
    : `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
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

  return (
    <Screen>
      <ScreenHeader title="Workshops & Retreats" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load events" subtitle={error} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, filter === f.value && styles.chipActive]}
              >
                <BodyText style={{ color: filter === f.value ? colors.white : colors.muted, fontSize: 13 }}>
                  {f.label}
                </BodyText>
              </Pressable>
            ))}
          </View>

          {rows.length === 0 ? (
            <EmptyState title="Nothing scheduled" subtitle="Check back soon." />
          ) : (
            rows.map((r) => (
              <Pressable key={r.id} onPress={() => router.push(`/events/${r.id}`)}>
                <Card style={{ marginBottom: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <Badge>{KIND_LABEL[r.kind]}</Badge>
                    {r.price != null && (
                      <BodyText style={{ fontWeight: "700" }}>
                        {r.currency === "USD" ? "$" : "₹"}
                        {r.price.toLocaleString("en-IN")}
                      </BodyText>
                    )}
                  </View>
                  <BodyText style={{ fontWeight: "700", fontSize: 16, marginTop: spacing.xs }}>{r.name}</BodyText>
                  <BodyText muted style={{ marginTop: spacing.xs }}>{dateRange(r.startDate, r.endDate)}</BodyText>
                  {r.location && <BodyText muted>{r.location}</BodyText>}
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
