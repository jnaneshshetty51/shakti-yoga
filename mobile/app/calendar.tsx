import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, Heading, LoadingView, EmptyState, Badge, Button } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { formatClassTime } from "@/lib/format";
import { colors, spacing, radius, shadows } from "@/theme";
import type { ClassesResponse, BookingRow } from "@/lib/types";

type Kind = "class" | "session" | "event" | "device";
interface Entry {
  id: string;
  kind: Kind;
  title: string;
  start: string;
  end: string;
  syncedEventId?: string;
  hasConflict?: boolean;
}

const KIND_META: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  class: { icon: "people-outline", label: "Group Class", tone: "success" },
  session: { icon: "medkit-outline", label: "Yoga Therapy", tone: "warning" },
  event: { icon: "sparkles-outline", label: "Retreat / Event", tone: "neutral" },
  device: { icon: "calendar-outline", label: "Personal Calendar", tone: "neutral" },
};

const SYNCED_EVENTS_KEY = "@shakti_synced_calendar_events_v1";
const SHOW_DEVICE_EVENTS_KEY = "@shakti_show_device_calendar_v1";

export default function CalendarScreen() {
  const { user } = useAuth();
  // Scoped per-account — otherwise a second user on a shared/family device inherits (and can
  // delete) whichever classes the previous account synced to the device calendar.
  const syncedEventsKey = user ? `${SYNCED_EVENTS_KEY}:${user.id}` : null;
  const showDeviceEventsKey = user ? `${SHOW_DEVICE_EVENTS_KEY}:${user.id}` : null;

  const classes = useResource(() => api.get<ClassesResponse>("/api/classes"), []);
  const bookings = useResource(() => api.get<{ bookings: BookingRow[] }>("/api/bookings"), []);
  const retreats = useResource(
    () => api.get<{ retreats: { id: string; name: string; startDate: string; endDate: string }[] }>("/api/retreats"),
    [],
  );

  const [syncedMap, setSyncedMap] = useState<Record<string, string>>({});
  const [showDeviceEvents, setShowDeviceEvents] = useState(false);
  const [deviceEvents, setDeviceEvents] = useState<Entry[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [loadingDeviceEvents, setLoadingDeviceEvents] = useState(false);
  const [filter, setFilter] = useState<"all" | "shakti" | "personal">("all");

  // Load saved sync map and device preferences
  useEffect(() => {
    if (!syncedEventsKey || !showDeviceEventsKey) {
      setSyncedMap({});
      setShowDeviceEvents(false);
      return;
    }
    (async () => {
      try {
        const [savedMap, savedPref] = await Promise.all([
          AsyncStorage.getItem(syncedEventsKey),
          AsyncStorage.getItem(showDeviceEventsKey),
        ]);
        setSyncedMap(savedMap ? JSON.parse(savedMap) : {});
        setShowDeviceEvents(savedPref === "true");
      } catch {
        // ignore parse error
      }
    })();
  }, [syncedEventsKey, showDeviceEventsKey]);

  const saveSyncedMap = async (newMap: Record<string, string>) => {
    setSyncedMap(newMap);
    if (!syncedEventsKey) return;
    await AsyncStorage.setItem(syncedEventsKey, JSON.stringify(newMap)).catch(() => {});
  };

  // Helper to get writable device calendar
  const getWritableCalendar = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow calendar access in device settings to sync classes.");
      return null;
    }
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const target =
      (Platform.OS === "ios"
        ? (await Calendar.getDefaultCalendarAsync().catch(() => null))
        : cals.find((c) => c.allowsModifications)) ?? cals[0];

    if (!target) {
      Alert.alert("No calendar", "Couldn't find a writable calendar on this device.");
      return null;
    }
    return target;
  };

  // Sync or unsync single item
  const handleToggleSync = async (e: Entry) => {
    if (e.kind === "device") return;
    const existingDeviceEventId = syncedMap[e.id];

    if (existingDeviceEventId) {
      // Prompt to remove
      Alert.alert(
        "Already Synced",
        `"${e.title}" is already on your device calendar.`,
        [
          { text: "Keep on Calendar", style: "cancel" },
          {
            text: "Remove from Device Calendar",
            style: "destructive",
            onPress: async () => {
              try {
                await Calendar.deleteEventAsync(existingDeviceEventId).catch(() => {});
                const next = { ...syncedMap };
                delete next[e.id];
                await saveSyncedMap(next);
                Alert.alert("Removed", "Event removed from your device calendar.");
              } catch {
                Alert.alert("Error", "Could not remove event from device calendar.");
              }
            },
          },
        ],
      );
      return;
    }

    const targetCal = await getWritableCalendar();
    if (!targetCal) return;

    try {
      const eventId = await Calendar.createEventAsync(targetCal.id, {
        title: `Shakti — ${e.title}`,
        startDate: new Date(e.start),
        endDate: new Date(e.end),
        notes: `Shakti Yoga ${KIND_META[e.kind].label}.\nJoin online classes from the Shakti app or web: https://shaktiyoga.in`,
        alarms: [{ relativeOffset: -30 }], // 30 min before
      });

      const next = { ...syncedMap, [e.id]: eventId };
      await saveSyncedMap(next);
      Alert.alert("Synced to Calendar", `"${e.title}" with a 30-min reminder has been added to your calendar.`);
    } catch {
      Alert.alert("Error", "Could not save event to device calendar.");
    }
  };

  // Sync all unsynced upcoming classes to device
  const handleSyncAll = async (shaktiEntries: Entry[]) => {
    const unsynced = shaktiEntries.filter((e) => !syncedMap[e.id] && new Date(e.end).getTime() > Date.now());
    if (unsynced.length === 0) {
      Alert.alert("All Synced", "All upcoming classes and sessions are already synced to your device calendar!");
      return;
    }

    const targetCal = await getWritableCalendar();
    if (!targetCal) return;

    setSyncingAll(true);
    const updatedMap = { ...syncedMap };
    let count = 0;

    try {
      for (const e of unsynced) {
        try {
          const eventId = await Calendar.createEventAsync(targetCal.id, {
            title: `Shakti — ${e.title}`,
            startDate: new Date(e.start),
            endDate: new Date(e.end),
            notes: `Shakti Yoga ${KIND_META[e.kind].label}.\nJoin classes: https://shaktiyoga.in`,
            alarms: [{ relativeOffset: -30 }],
          });
          updatedMap[e.id] = eventId;
          count++;
        } catch {
          // continue with others
        }
      }
      await saveSyncedMap(updatedMap);
      Alert.alert("Calendar Synced", `Successfully added ${count} upcoming session${count > 1 ? "s" : ""} to your device calendar.`);
    } catch {
      Alert.alert("Partial Sync", `Added ${count} events before encountering an issue.`);
    } finally {
      setSyncingAll(false);
    }
  };

  // Fetch device events (Bi-directional: Device Calendar -> Shakti)
  const fetchDeviceCalendarEvents = useCallback(async () => {
    try {
      setLoadingDeviceEvents(true);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        setShowDeviceEvents(false);
        if (showDeviceEventsKey) await AsyncStorage.setItem(showDeviceEventsKey, "false");
        Alert.alert("Permission needed", "Please enable calendar access in Settings to view your personal calendar.");
        return;
      }

      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calIds = cals.map((c) => c.id);

      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

      const events = await Calendar.getEventsAsync(calIds, startDate, endDate);

      // Filter out events created by Shakti to avoid duplicate mirror entries
      const externalEvents = events.filter((ev) => {
        const isShakti =
          ev.title?.startsWith("Shakti —") ||
          ev.notes?.includes("Shakti Yoga") ||
          Object.values(syncedMap).includes(ev.id);
        return !isShakti;
      });

      const parsed: Entry[] = externalEvents.map((ev) => ({
        id: `dev-${ev.id}`,
        kind: "device",
        title: ev.title || "Personal Event",
        start: new Date(ev.startDate).toISOString(),
        end: new Date(ev.endDate).toISOString(),
      }));

      setDeviceEvents(parsed);
    } catch {
      // graceful fallback
    } finally {
      setLoadingDeviceEvents(false);
    }
  }, [syncedMap]);

  const handleToggleDeviceEventsSwitch = async (enabled: boolean) => {
    setShowDeviceEvents(enabled);
    if (showDeviceEventsKey) await AsyncStorage.setItem(showDeviceEventsKey, enabled ? "true" : "false");
    if (enabled) {
      await fetchDeviceCalendarEvents();
    } else {
      setDeviceEvents([]);
    }
  };

  useEffect(() => {
    if (showDeviceEvents) {
      fetchDeviceCalendarEvents();
    }
  }, [showDeviceEvents, fetchDeviceCalendarEvents]);

  const loading = classes.loading || bookings.loading || retreats.loading;
  const error = classes.error || bookings.error || retreats.error;

  // Base Shakti entries (classes + upcoming bookings + retreats), shared by the day-grouped
  // list and "Sync All" so the two can never silently diverge on what counts as upcoming.
  const allShaktiEntries = useMemo(() => {
    const list: Entry[] = [];
    const cls = classes.data;
    if (cls?.today) {
      [...cls.today, ...cls.upcoming].forEach((c) =>
        list.push({ id: `c-${c.id}`, kind: "class", title: c.batchName, start: c.startsAt, end: c.endsAt }),
      );
    }

    const cutoff = Date.now() - 3_600_000;
    bookings.data?.bookings
      ?.filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > cutoff)
      .forEach((b) =>
        list.push({
          id: `b-${b.id}`,
          kind: "session",
          title: "Yoga Therapy session",
          start: b.date,
          end: new Date(new Date(b.date).getTime() + 45 * 60_000).toISOString(),
        }),
      );

    retreats.data?.retreats?.forEach((r) =>
      list.push({ id: `r-${r.id}`, kind: "event", title: r.name, start: r.startDate, end: r.endDate }),
    );

    return list;
  }, [classes.data, bookings.data, retreats.data]);

  // Build unified schedule with overlap detection
  const { byDay, totalUpcomingShakti, totalSynced } = useMemo(() => {
    // Clone — this list gets mutated (syncedEventId) and merged with device events below,
    // and must not leak those per-render annotations back into the shared allShaktiEntries.
    const entries: Entry[] = allShaktiEntries.map((e) => ({ ...e }));

    const totalUpcomingShakti = entries.length;
    const totalSynced = entries.filter((e) => !!syncedMap[e.id]).length;

    // Attach synced device event IDs
    entries.forEach((e) => {
      if (syncedMap[e.id]) e.syncedEventId = syncedMap[e.id];
    });

    // If device events enabled, merge and check conflicts
    if (showDeviceEvents && deviceEvents.length > 0) {
      deviceEvents.forEach((dev) => entries.push(dev));

      // Check overlaps
      const shaktiItems = entries.filter((e) => e.kind !== "device");
      const devItems = entries.filter((e) => e.kind === "device");

      shaktiItems.forEach((shakti) => {
        const sStart = new Date(shakti.start).getTime();
        const sEnd = new Date(shakti.end).getTime();

        const overlap = devItems.some((d) => {
          const dStart = new Date(d.start).getTime();
          const dEnd = new Date(d.end).getTime();
          return (sStart < dEnd && sEnd > dStart);
        });

        if (overlap) shakti.hasConflict = true;
      });
    }

    // Apply category filter
    let filtered = entries;
    if (filter === "shakti") filtered = entries.filter((e) => e.kind !== "device");
    if (filter === "personal") filtered = entries.filter((e) => e.kind === "device");

    filtered.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const groups: { day: string; label: string; items: Entry[] }[] = [];
    for (const e of filtered) {
      const day = new Date(e.start).toDateString();
      let g = groups.find((x) => x.day === day);
      if (!g) {
        g = {
          day,
          label: new Date(e.start).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          items: [],
        };
        groups.push(g);
      }
      g.items.push(e);
    }

    return { byDay: groups, totalUpcomingShakti, totalSynced };
  }, [allShaktiEntries, syncedMap, showDeviceEvents, deviceEvents, filter]);

  return (
    <Screen>
      <ScreenHeader
        title="Schedule & Sync"
        rightAction={
          <Pressable
            onPress={() => handleSyncAll(allShaktiEntries)}
            hitSlop={8}
            disabled={syncingAll || totalUpcomingShakti === 0}
            style={styles.headerSyncBtn}
          >
            {syncingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={totalSynced === totalUpcomingShakti && totalUpcomingShakti > 0 ? "checkmark-circle" : "cloud-upload-outline"}
                size={22}
                color={totalSynced === totalUpcomingShakti && totalUpcomingShakti > 0 ? colors.primary : colors.secondary}
              />
            )}
          </Pressable>
        }
      />

      {/* Sync Status Banner */}
      <View style={styles.syncBanner}>
        <View style={{ flex: 1 }}>
          <BodyText style={{ fontWeight: "700", fontSize: 13 }}>
            Bi-Directional Calendar Sync
          </BodyText>
          <BodyText muted style={{ fontSize: 12 }}>
            {totalSynced} of {totalUpcomingShakti} classes saved to phone calendar
          </BodyText>
        </View>
        <Button
          variant="secondary"
          loading={syncingAll}
          onPress={() => handleSyncAll(allShaktiEntries)}
        >
          {totalSynced === totalUpcomingShakti && totalUpcomingShakti > 0 ? "Re-sync" : "Sync All"}
        </Button>
      </View>

      {/* Bi-Directional Toggle: Device Calendar Integration */}
      <View style={styles.deviceSyncRow}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
            <BodyText style={{ fontWeight: "600", fontSize: 13 }}>
              Show Phone Calendar Events
            </BodyText>
          </View>
          <BodyText muted style={{ fontSize: 11, marginTop: 2 }}>
            View your personal schedule alongside yoga to spot conflicts
          </BodyText>
        </View>
        {loadingDeviceEvents ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={showDeviceEvents}
            onValueChange={handleToggleDeviceEventsSwitch}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={colors.white}
          />
        )}
      </View>

      {/* Filter Tabs if phone calendar is on */}
      {showDeviceEvents && (
        <View style={styles.filterTabsRow}>
          <Pressable
            onPress={() => setFilter("all")}
            style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          >
            <BodyText style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
              All ({byDay.reduce((acc, g) => acc + g.items.length, 0)})
            </BodyText>
          </Pressable>
          <Pressable
            onPress={() => setFilter("shakti")}
            style={[styles.filterTab, filter === "shakti" && styles.filterTabActive]}
          >
            <BodyText style={[styles.filterTabText, filter === "shakti" && styles.filterTabTextActive]}>
              Shakti ({totalUpcomingShakti})
            </BodyText>
          </Pressable>
          <Pressable
            onPress={() => setFilter("personal")}
            style={[styles.filterTab, filter === "personal" && styles.filterTabActive]}
          >
            <BodyText style={[styles.filterTabText, filter === "personal" && styles.filterTabTextActive]}>
              Personal ({deviceEvents.length})
            </BodyText>
          </Pressable>
        </View>
      )}

      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState
          title="Couldn't load your calendar"
          subtitle={error}
          onRetry={() => {
            classes.reload();
            bookings.reload();
            retreats.reload();
          }}
        />
      ) : byDay.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          subtitle="Your classes, therapy sessions, and device events show here."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {byDay.map((g) => (
            <View key={g.day} style={{ marginBottom: spacing.lg }}>
              <Heading size="sm" style={{ marginBottom: spacing.sm }}>
                {g.label}
              </Heading>
              {g.items.map((e) => {
                const isSynced = Boolean(syncedMap[e.id]);
                const isDevice = e.kind === "device";

                return (
                  <Card
                    key={e.id}
                    style={[
                      styles.itemCard,
                      isDevice && styles.deviceCard,
                      e.hasConflict && styles.conflictCard,
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemIconWrap}>
                        <Ionicons
                          name={KIND_META[e.kind].icon}
                          size={18}
                          color={isDevice ? colors.textMuted : colors.primary}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <BodyText style={[styles.itemTitle, isDevice && styles.deviceTitle]}>
                          {e.title}
                        </BodyText>
                        <View style={styles.metaRow}>
                          <BodyText muted style={{ fontSize: 12 }}>
                            {formatClassTime(e.start)}
                          </BodyText>
                          <Badge tone={KIND_META[e.kind].tone}>{KIND_META[e.kind].label}</Badge>
                          {isSynced && (
                            <Badge tone="success">Synced to Phone</Badge>
                          )}
                        </View>
                      </View>

                      {/* Action */}
                      {!isDevice && (
                        <Pressable
                          onPress={() => handleToggleSync(e)}
                          hitSlop={10}
                          style={[styles.syncActionBtn, isSynced && styles.syncActionBtnActive]}
                          accessibilityRole="button"
                          accessibilityLabel={isSynced ? "Manage calendar sync" : "Sync to calendar"}
                        >
                          <Ionicons
                            name={isSynced ? "checkmark-circle" : "cloud-upload-outline"}
                            size={20}
                            color={isSynced ? colors.primary : colors.secondary}
                          />
                        </Pressable>
                      )}
                    </View>

                    {/* Conflict Alert Warning */}
                    {e.hasConflict && (
                      <View style={styles.conflictBanner}>
                        <Ionicons name="warning" size={14} color={colors.warning} />
                        <BodyText style={styles.conflictText}>
                          Personal calendar overlap detected for this time slot
                        </BodyText>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerSyncBtn: {
    padding: spacing.xs,
  },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.sage,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
  },
  deviceSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterTabsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterTab: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  itemCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  deviceCard: {
    backgroundColor: colors.accent,
    borderStyle: "dashed",
  },
  conflictCard: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  itemIconWrap: {
    marginTop: 2,
  },
  itemTitle: {
    fontWeight: "700",
    fontSize: 15,
  },
  deviceTitle: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  syncActionBtn: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryLight,
  },
  syncActionBtnActive: {
    backgroundColor: colors.sage,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  conflictText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: "600",
  },
});
