import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { timeUntil, formatClassTime } from "@/lib/format";
import { colors, spacing } from "@/theme";
import type { ClassesResponse, BookingRow } from "@/lib/types";

function greeting(name?: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

function EverydayHome() {
  const { user } = useAuth();
  const isTrial = user?.role === "trial";
  const { data, loading, error, reload } = useResource(() => api.get<ClassesResponse>("/api/classes"), []);
  const { joiningId, joinClass } = useJoin();

  if (loading) return <LoadingView />;
  if (error) return <EmptyState title="Couldn't load classes" subtitle={error} />;
  if (!data) return null;

  if (!data.access.ok) {
    const { outOfSessions, paywall, reason } = data.access;
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Card>
          <Heading size="sm">
            {outOfSessions
              ? "You've used all your sessions"
              : paywall
                ? isTrial ? "Your free trial is complete" : "Your membership ended"
                : "Group classes aren't part of your plan"}
          </Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>{reason}</BodyText>
          {outOfSessions ? (
            <Link href="/support" asChild><Button>Contact Support</Button></Link>
          ) : paywall ? (
            <Button onPress={() => router.push(isTrial ? "/info/everyday" : "/membership")}>
              {isTrial ? "See plans" : "Renew Membership"}
            </Button>
          ) : null}
        </Card>
        <SessionBalanceCard balance={data.access.sessionBalance} style={{ marginTop: spacing.md }} />
        <ExploreLinks />
      </ScrollView>
    );
  }

  const all = [...data.today, ...data.upcoming].filter((c) => new Date(c.endsAt).getTime() > Date.now());
  const next = all[0];
  const restToday = data.today.filter((c) => c.id !== next?.id);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <AnnouncementBanner />

      {isTrial ? (
        <Card style={styles.trialBanner}>
          <BodyText style={{ fontWeight: "700" }}>This is your one free trial class</BodyText>
          <BodyText muted style={{ fontSize: 13, marginTop: 2 }}>Pick any batch below. After it, choose a plan to keep going.</BodyText>
        </Card>
      ) : (
        <SessionBalanceCard balance={data.access.sessionBalance} style={{ marginBottom: spacing.lg }} />
      )}

      {next ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <BodyText muted style={styles.eyebrow}>{isTrial ? "Your trial class" : "Next Class"}</BodyText>
          <Heading size="md">{next.batchName}</Heading>
          <BodyText style={{ marginTop: spacing.xs }}>{formatClassTime(next.startsAt)} · {next.teacher}</BodyText>
          <Badge tone={next.joinable ? "success" : "neutral"}>{timeUntil(next.startsAt)}</Badge>
          <Button style={{ marginTop: spacing.md }} disabled={!next.joinable} loading={joiningId === next.id} onPress={() => joinClass(next.id)}>
            {next.joinable ? "Join Class" : "Opens 30 min before"}
          </Button>
        </Card>
      ) : (
        <EmptyState title="No more classes today" subtitle="Check tomorrow's timetable in Classes." />
      )}

      {restToday.length > 0 && (
        <>
          <Heading size="sm" style={{ marginBottom: spacing.sm }}>Also today</Heading>
          {restToday.map((c) => (
            <Card key={c.id} style={{ marginBottom: spacing.sm }}>
              <BodyText style={{ fontWeight: "700" }}>{c.batchName}</BodyText>
              <BodyText muted>{formatClassTime(c.startsAt)} · {c.teacher}</BodyText>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function TherapyHome() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(() => api.get<{ bookings: BookingRow[] }>("/api/bookings"), []);
  const { joiningId, joinBooking } = useJoin();

  if (loading) return <LoadingView />;
  if (error) return <EmptyState title="Couldn't load your sessions" subtitle={error} />;

  const bookings = data?.bookings ?? [];
  const upcoming = bookings
    .filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = upcoming[0];
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <AnnouncementBanner />

      {next ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <BodyText muted style={styles.eyebrow}>Your Next Session</BodyText>
          <Heading size="md">Yoga Therapy</Heading>
          <BodyText style={{ marginTop: spacing.xs }}>{formatClassTime(next.date)} · {next.teacher}</BodyText>
          <Badge>{timeUntil(next.date)}</Badge>
          <Button style={{ marginTop: spacing.md }} loading={joiningId === next.id} onPress={() => joinBooking(next.id)}>Join Session</Button>
        </Card>
      ) : (
        <EmptyState title="No upcoming sessions" subtitle="Your therapist schedules your sessions — check back or contact Support." />
      )}

      <Pressable onPress={() => router.push("/therapy")}>
        <Card style={styles.linkRow}>
          <View style={{ flex: 1 }}>
            <BodyText muted style={styles.eyebrow}>Therapy Journey</BodyText>
            <Heading size="md">{completed} completed</Heading>
            <BodyText muted>{user?.credits ?? 0} sessions remaining</BodyText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      </Pressable>
    </ScrollView>
  );
}

function ExploreLinks() {
  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <TeaserRow icon="book-outline" label="Read & watch" onPress={() => router.push("/(tabs)/practice")} />
      <TeaserRow icon="help-circle-outline" label="FAQ" onPress={() => router.push("/faq")} />
      <TeaserRow icon="calendar-outline" label="Workshops & Retreats" onPress={() => router.push("/events")} />
    </View>
  );
}

function TeaserRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.linkRow}>
        <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 28 }} />
        <BodyText style={{ flex: 1, fontWeight: "600" }}>{label}</BodyText>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

function ExploreHome() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={{ marginBottom: spacing.md }}>
        <Heading size="sm">Everyday Yoga</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
          Live classes every weekday. Start with a free trial class.
        </BodyText>
        <Button onPress={() => router.push("/info/everyday")}>Explore Everyday Yoga</Button>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Heading size="sm">Yoga Therapy</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
          One-to-one sessions with an assigned therapist, built around a real health concern.
        </BodyText>
        <Button variant="outline" onPress={() => router.push("/info/therapy")}>Begin an assessment</Button>
      </Card>

      <ExploreLinks />
      <TeaserRow icon="chatbubble-ellipses-outline" label="Success stories" onPress={() => router.push("/testimonials")} />
      <TeaserRow icon="call-outline" label="Contact Shakti" onPress={() => router.push("/contact")} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">{greeting(user?.name)}</Heading>
      </View>
      {user?.role === "member_therapy" ? (
        <TherapyHome />
      ) : user?.role === "member_everyday" || user?.role === "trial" ? (
        <EverydayHome />
      ) : (
        <ExploreHome />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs, color: colors.secondary },
  trialBanner: { marginBottom: spacing.lg, backgroundColor: colors.accent, borderColor: colors.secondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
