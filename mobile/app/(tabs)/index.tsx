import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { timeUntil, formatClassTime } from "@/lib/format";
import { colors, spacing } from "@/theme";
import type { ClassesResponse } from "@/lib/types";
import type { BookingRow } from "@/lib/types";

function greeting(name?: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

function EverydayHome() {
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
                ? "Your membership isn't active"
                : "Group classes aren't part of your plan"}
          </Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            {reason}
          </BodyText>
          {outOfSessions ? (
            <Link href="/support" asChild>
              <Button>Contact Support</Button>
            </Link>
          ) : paywall ? (
            <Link href="/membership" asChild>
              <Button>Renew Membership</Button>
            </Link>
          ) : null}
        </Card>
        <SessionBalanceCard balance={data.access.sessionBalance} style={{ marginTop: spacing.md }} />
      </ScrollView>
    );
  }

  const all = [...data.today, ...data.upcoming].filter((c) => new Date(c.endsAt).getTime() > Date.now());
  const next = all[0];
  const restToday = data.today.filter((c) => c.id !== next?.id);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <SessionBalanceCard balance={data.access.sessionBalance} style={{ marginBottom: spacing.lg }} />

      {next ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <BodyText muted style={styles.eyebrow}>Next Class</BodyText>
          <Heading size="md">{next.batchName}</Heading>
          <BodyText style={{ marginTop: spacing.xs }}>
            {formatClassTime(next.startsAt)} · {next.teacher}
          </BodyText>
          <Badge tone={next.joinable ? "success" : "neutral"}>{timeUntil(next.startsAt)}</Badge>
          <Button
            style={{ marginTop: spacing.md }}
            disabled={!next.joinable}
            loading={joiningId === next.id}
            onPress={() => joinClass(next.id)}
          >
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
  const { data, loading, error, reload } = useResource(() => api.get<{ bookings: BookingRow[] }>("/api/bookings"), []);
  const { joiningId, joinBooking } = useJoin();
  const { user } = useAuth();

  if (loading) return <LoadingView />;
  if (error) return <EmptyState title="Couldn't load your sessions" subtitle={error} />;

  const upcoming = (data?.bookings ?? [])
    .filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = upcoming[0];
  const completed = (data?.bookings ?? []).filter((b) => b.status === "COMPLETED").length;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      {next ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <BodyText muted style={styles.eyebrow}>Your Next Session</BodyText>
          <Heading size="md">Yoga Therapy</Heading>
          <BodyText style={{ marginTop: spacing.xs }}>
            {formatClassTime(next.date)} · {next.teacher}
          </BodyText>
          <Badge>{timeUntil(next.date)}</Badge>
          <Button style={{ marginTop: spacing.md }} loading={joiningId === next.id} onPress={() => joinBooking(next.id)}>
            Join Session
          </Button>
        </Card>
      ) : (
        <EmptyState title="No upcoming sessions" subtitle="Your therapist will schedule your next session." />
      )}

      <Card>
        <BodyText muted style={styles.eyebrow}>Therapy Journey</BodyText>
        <Heading size="md">{completed} completed</Heading>
        <BodyText muted>{user?.credits ?? 0} sessions remaining</BodyText>
      </Card>
    </ScrollView>
  );
}

function ExploreHome() {
  return (
    <View style={{ padding: spacing.lg, flex: 1, justifyContent: "center" }}>
      <Card>
        <Heading size="sm">Join Shakti to access live classes and your personalised yoga journey.</Heading>
        <Button
          style={{ marginTop: spacing.md }}
          onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/programs")}
        >
          Explore Programs
        </Button>
      </Card>
    </View>
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
});
