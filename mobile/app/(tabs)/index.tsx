import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Linking } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { StreakCard } from "@/components/StreakCard";
import { ChallengeCard } from "@/components/ChallengeCard";
import { ContentRail } from "@/components/ContentRail";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { api, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { timeUntil, formatClassTime } from "@/lib/format";
import { colors, spacing } from "@/theme";
import type { HomeResponse, FeedItem } from "@/lib/types";

function greeting(name?: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

function discoveryItems(data: HomeResponse): FeedItem[] {
  return [data.content.featuredReel, ...data.content.forYou].filter((x): x is FeedItem => Boolean(x));
}

function CommunityCard({ community }: { community: HomeResponse["community"] }) {
  if (!community) return null;
  return (
    <Pressable onPress={() => Linking.openURL(community.whatsappLink)}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.linkRow}>
          <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1, fontWeight: "700" }}>{community.name}</BodyText>
          <Ionicons name="open-outline" size={16} color={colors.muted} />
        </View>
        {community.pinnedMessage ? (
          <BodyText muted style={{ marginTop: spacing.xs, fontSize: 13 }} numberOfLines={2}>
            {community.pinnedMessage}
          </BodyText>
        ) : null}
      </Card>
    </Pressable>
  );
}

function DiscoverySections({ data }: { data: HomeResponse }) {
  const rec = data.content.recommended;
  return (
    <>
      <ContentRail title="From Shakti" items={discoveryItems(data)} />
      {rec && rec.items.length > 0 && (
        <ContentRail title={`Because you like ${rec.category.toLowerCase()}`} items={rec.items} />
      )}
    </>
  );
}

function ExploreLinks() {
  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <TeaserRow icon="book-outline" label="Read & watch" onPress={() => router.push("/(tabs)/practice")} />
      <TeaserRow icon="trophy-outline" label="Challenges" onPress={() => router.push("/challenges")} />
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

function EverydayHome({ data, loading, reload }: { data: HomeResponse; loading: boolean; reload: () => void }) {
  const { user } = useAuth();
  const isTrial = user?.role === "trial";
  const { joiningId, joinClass } = useJoin();
  const c = data.classes;

  if (!c) return <EmptyState title="Couldn't load your classes" subtitle="Pull down to try again." />;

  if (!c.access.ok) {
    const { outOfSessions, paywall, reason } = c.access;
    return (
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      >
        <AnnouncementBanner announcement={data.announcement} />
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
        <SessionBalanceCard balance={c.sessionBalance} style={{ marginTop: spacing.md }} />
        <View style={{ marginTop: spacing.lg }}>
          <DiscoverySections data={data} />
          <CommunityCard community={data.community} />
        </View>
        <ExploreLinks />
      </ScrollView>
    );
  }

  const next = c.next;

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <AnnouncementBanner announcement={data.announcement} />

      {isTrial ? (
        <Card style={styles.trialBanner}>
          <BodyText style={{ fontWeight: "700" }}>This is your one free trial class</BodyText>
          <BodyText muted style={{ fontSize: 13, marginTop: 2 }}>Pick any batch below. After it, choose a plan to keep going.</BodyText>
        </Card>
      ) : (
        <SessionBalanceCard balance={c.sessionBalance} style={{ marginBottom: spacing.lg }} />
      )}

      <StreakCard streak={data.streak} />

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

      {c.restToday.length > 0 && (
        <>
          <Heading size="sm" style={{ marginBottom: spacing.sm }}>Also today</Heading>
          {c.restToday.map((cls) => (
            <Pressable key={cls.id} onPress={() => router.push("/(tabs)/classes")}>
              <Card style={{ marginBottom: spacing.sm }}>
                <BodyText style={{ fontWeight: "700" }}>{cls.batchName}</BodyText>
                <BodyText muted>{formatClassTime(cls.startsAt)} · {cls.teacher}</BodyText>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      <View style={{ marginTop: spacing.md }}>
        <ChallengeCard challenge={data.activeChallenge} />
        <DiscoverySections data={data} />
        <CommunityCard community={data.community} />
      </View>
    </ScrollView>
  );
}

function TherapyHome({ data, loading, reload }: { data: HomeResponse; loading: boolean; reload: () => void }) {
  const { joiningId, joinBooking } = useJoin();
  const t = data.therapy;

  if (!t) return <EmptyState title="Couldn't load your sessions" subtitle="Pull down to try again." />;

  const next = t.next;
  const title = next?.type === "CONSULTATION" ? "Consultation" : "Yoga Therapy session";

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <AnnouncementBanner announcement={data.announcement} />

      {next ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <BodyText muted style={styles.eyebrow}>Your Next Session</BodyText>
          <Heading size="md">{title}</Heading>
          <BodyText style={{ marginTop: spacing.xs }}>{formatClassTime(next.date)} · {next.teacher}</BodyText>
          <Badge tone={next.joinable ? "success" : "neutral"}>{timeUntil(next.date)}</Badge>
          <Button
            style={{ marginTop: spacing.md }}
            disabled={!next.joinable}
            loading={joiningId === next.id}
            onPress={() => joinBooking(next.id)}
          >
            {next.joinable ? "Join Session" : "Opens 15 min before"}
          </Button>
        </Card>
      ) : (
        <EmptyState title="No upcoming sessions" subtitle="Your therapist schedules your sessions — check back or contact Support." />
      )}

      <Pressable onPress={() => router.push("/therapy")}>
        <Card style={styles.linkRow}>
          <View style={{ flex: 1 }}>
            <BodyText muted style={styles.eyebrow}>Therapy Journey</BodyText>
            <Heading size="md">{t.completed} completed</Heading>
            <BodyText muted>{t.creditsRemaining} sessions remaining</BodyText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      </Pressable>

      <View style={{ marginTop: spacing.lg }}>
        <ChallengeCard challenge={data.activeChallenge} />
        <DiscoverySections data={data} />
        <CommunityCard community={data.community} />
      </View>
    </ScrollView>
  );
}

function ExploreHome({ data }: { data: HomeResponse | null }) {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {isStaff && (
        <Card style={{ marginBottom: spacing.md }}>
          <Heading size="sm">{user?.role === "teacher" ? "Teacher tools" : "Admin console"}</Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            Manage classes, members and content on the web.
          </BodyText>
          <Button onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/admin`)}>Open on the web</Button>
        </Card>
      )}

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

      {data && <DiscoverySections data={data} />}

      <ExploreLinks />
      <TeaserRow icon="chatbubble-ellipses-outline" label="Success stories" onPress={() => router.push("/testimonials")} />
      <TeaserRow icon="call-outline" label="Contact Shakti" onPress={() => router.push("/contact")} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(() => api.get<HomeResponse>("/api/me/home"), []);

  const role = user?.role;
  const isEveryday = role === "member_everyday" || role === "member_starter" || role === "trial";
  const isTherapy = role === "member_therapy";

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg" style={{ flex: 1 }}>{greeting(user?.name)}</Heading>
        {user && <NotificationBell count={data?.activity.unreadCount ?? 0} />}
      </View>

      {!data && loading ? (
        <LoadingView />
      ) : !data && error ? (
        <View style={{ flex: 1 }}>
          <EmptyState title="Couldn't load your home" subtitle={error} />
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Button variant="outline" onPress={reload}>Try again</Button>
          </View>
        </View>
      ) : isTherapy ? (
        <TherapyHome data={data!} loading={loading} reload={reload} />
      ) : isEveryday ? (
        <EverydayHome data={data!} loading={loading} reload={reload} />
      ) : (
        <ExploreHome data={data} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  eyebrow: { textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs, color: colors.secondary },
  trialBanner: { marginBottom: spacing.lg, backgroundColor: colors.accent, borderColor: colors.secondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
