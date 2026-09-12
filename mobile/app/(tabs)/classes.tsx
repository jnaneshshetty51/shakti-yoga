import React from "react";
import { View, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Screen, Heading, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { TherapyScheduleView } from "@/components/TherapyScheduleView";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { formatClassTime, formatDay } from "@/lib/format";
import { colors, spacing } from "@/theme";
import type { ClassesResponse, ClassView } from "@/lib/types";

function ClassCard({ item }: { item: ClassView }) {
  const { joiningId, joinClass } = useJoin();
  return (
    <Card style={styles.card}>
      <BodyText style={{ fontWeight: "700" }}>{item.batchName}</BodyText>
      <BodyText muted style={{ marginBottom: spacing.sm }}>
        {formatClassTime(item.startsAt)} · {item.teacher}
      </BodyText>
      <Button
        variant={item.joinable ? "primary" : "outline"}
        disabled={!item.joinable}
        loading={joiningId === item.id}
        onPress={() => joinClass(item.id)}
      >
        {item.status === "Cancelled" ? "Cancelled" : item.joinable ? "Join Class" : "Opens 30 min before"}
      </Button>
    </Card>
  );
}

export default function ClassesScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(() => api.get<ClassesResponse>("/api/classes"), []);

  if (user?.role === "member_therapy") {
    return (
      <Screen>
        <View style={styles.header}>
          <Heading size="lg">My Therapy</Heading>
        </View>
        <TherapyScheduleView />
      </Screen>
    );
  }

  const access = data?.access;

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">Classes</Heading>
      </View>
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load the timetable" subtitle={error} />
      ) : !data || !access?.ok ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card>
            <Heading size="sm">
              {access && !access.ok && access.outOfSessions
                ? "You've used all your sessions"
                : "No class access"}
            </Heading>
            <BodyText muted style={{ marginTop: spacing.xs, marginBottom: access && !access.ok && (access.outOfSessions || access.paywall) ? spacing.md : 0 }}>
              {access && !access.ok ? access.reason : "Join Shakti to access the daily class timetable."}
            </BodyText>
            {access && !access.ok && access.outOfSessions ? (
              <Link href="/support" asChild><Button>Contact Support</Button></Link>
            ) : access && !access.ok && access.paywall ? (
              <Link href="/membership" asChild><Button>Renew Membership</Button></Link>
            ) : null}
          </Card>
          {access && !access.ok && <SessionBalanceCard balance={access.sessionBalance} style={{ marginTop: spacing.md }} />}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
          <SessionBalanceCard balance={access.sessionBalance} style={{ marginBottom: spacing.md }} />
          <Heading size="sm" style={{ marginBottom: spacing.sm }}>Today</Heading>
          {data.today.length === 0 ? (
            <BodyText muted style={{ marginBottom: spacing.lg }}>No more classes today.</BodyText>
          ) : (
            data.today.map((c) => <ClassCard key={c.id} item={c} />)
          )}

          {data.upcoming.length > 0 && (
            <>
              <Heading size="sm" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Upcoming</Heading>
              {data.upcoming.map((c) => (
                <View key={c.id} style={styles.upcomingRow}>
                  <BodyText style={{ fontWeight: "700" }}>{formatDay(c.startsAt)}</BodyText>
                  <BodyText muted>{c.batchName} · {formatClassTime(c.startsAt)} · {c.teacher}</BodyText>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  upcomingRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
