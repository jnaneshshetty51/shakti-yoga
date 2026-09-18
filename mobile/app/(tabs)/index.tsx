import React, { useRef } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Screen, Heading, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { HomeHeader } from "@/components/HomeHeader";
import { HeroClassCard } from "@/components/HeroClassCard";
import { TodaysScheduleCard } from "@/components/TodaysScheduleCard";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { YourPracticeCard } from "@/components/YourPracticeCard";
import { TakeAMomentSection } from "@/components/TakeAMomentSection";
import { FromShaktiCard } from "@/components/FromShaktiCard";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { VisitorHeroSection } from "@/components/VisitorHeroSection";
import { useAuth } from "@/context/AuthContext";
import { api, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { colors, spacing, radius, shadows } from "@/theme";
import type { HomeResponse, FeedItem } from "@/lib/types";

const PLAN_LABEL: Record<string, string> = {
  member_everyday: "Everyday Yoga",
  member_starter: "Starter",
  trial: "Free Trial",
};

/** Exactly one relevant piece of content — Home is not a feed. */
function pickFromShakti(data: HomeResponse): FeedItem | null {
  return data.content.founderMessage ?? data.content.featured ?? data.content.forYou[0] ?? null;
}

function TeaserRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.teaserPressable, pressed && { opacity: 0.85 }]}>
      <Card style={styles.teaserCard}>
        <View style={styles.teaserIconCircle}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <BodyText style={styles.teaserLabel}>{label}</BodyText>
          {subtitle ? (
            <BodyText muted style={styles.teaserSubtitle} numberOfLines={1}>
              {subtitle}
            </BodyText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

function EverydayHome({
  data,
  loading,
  reload,
}: {
  data: HomeResponse;
  loading: boolean;
  reload: () => void;
}) {
  const { user } = useAuth();
  const isTrial = user?.role === "trial";
  const { joiningId, joinClass } = useJoin();
  const c = data.classes;
  const fromShakti = pickFromShakti(data);
  const planLabel = user?.role ? PLAN_LABEL[user.role] : undefined;

  if (!c) {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
      >
        <EmptyState title="Couldn't load your classes" subtitle="Pull down to refresh and try again." />
      </ScrollView>
    );
  }

  // Paywall or session-exhausted state — membership has actually lapsed.
  if (!c.access.ok) {
    const { outOfSessions, paywall, reason } = c.access;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
      >
        <Card style={styles.paywallCard}>
          <View style={styles.paywallIcon}>
            <Ionicons name="leaf-outline" size={24} color={colors.secondary} />
          </View>
          <Heading size="sm" style={{ textAlign: "center" }}>
            {outOfSessions
              ? "You've completed all your sessions"
              : paywall
              ? isTrial
                ? "Your free trial class is complete"
                : "Your practice is waiting for you 🌿"
              : "Group classes aren't included in your plan"}
          </Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md, textAlign: "center" }}>
            {reason}
          </BodyText>
          {outOfSessions ? (
            <Link href="/support" asChild>
              <Button>Contact Support</Button>
            </Link>
          ) : paywall ? (
            <Button onPress={() => router.push("/subscribe")}>
              {isTrial ? "See plans" : "Renew Membership"}
            </Button>
          ) : null}
        </Card>

        <SessionBalanceCard balance={c.sessionBalance} style={{ marginBottom: spacing.lg }} />
        <YourPracticeCard practice={data.practice} />
        <TakeAMomentSection />
        <FromShaktiCard item={fromShakti} />
        <AnnouncementBanner announcement={data.announcement} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <HeroClassCard
        nextClass={c.next}
        isTrial={isTrial}
        joiningId={joiningId}
        onJoinClass={joinClass}
        restTodayCount={c.restToday.length}
      />

      <TodaysScheduleCard
        today={[
          // `next` can be tomorrow's class once today's are all done — only
          // fold it into "Today" when it's genuinely today's.
          ...(c.next && new Date(c.next.startsAt).toDateString() === new Date().toDateString() ? [c.next] : []),
          ...c.restToday,
        ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())}
        nextId={c.next?.id ?? null}
      />

      {!isTrial && (
        <SessionBalanceCard balance={c.sessionBalance} planLabel={planLabel} style={{ marginBottom: spacing.lg }} />
      )}

      <YourPracticeCard practice={data.practice} />

      <TakeAMomentSection />

      <FromShaktiCard item={fromShakti} />

      <AnnouncementBanner announcement={data.announcement} />
    </ScrollView>
  );
}

function TherapyHome({
  data,
  loading,
  reload,
}: {
  data: HomeResponse;
  loading: boolean;
  reload: () => void;
}) {
  const { joiningId, joinBooking } = useJoin();
  const t = data.therapy;
  const fromShakti = pickFromShakti(data);

  if (!t) {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
      >
        <EmptyState title="Couldn't load your sessions" subtitle="Pull down to try again." />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <HeroClassCard nextTherapy={t.next} joiningId={joiningId} onJoinTherapy={joinBooking} />

      {/* Membership — therapy's equivalent of "sessions remaining" */}
      <Pressable onPress={() => router.push("/therapy")} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Card style={styles.therapyJourneyCard}>
          <View style={styles.therapyJourneyContent}>
            <BodyText style={styles.therapyEyebrow}>YOGA THERAPY</BodyText>
            <Heading size="md" style={{ color: colors.primary, marginTop: 2 }}>
              {t.completed} sessions completed
            </Heading>
            <BodyText muted style={{ fontSize: 13, marginTop: 2 }}>
              {t.creditsRemaining} {t.creditsRemaining === 1 ? "credit" : "credits"} remaining in current cycle
            </BodyText>
          </View>
          <View style={styles.therapyJourneyArrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </Card>
      </Pressable>

      <YourPracticeCard practice={data.practice} />

      <TakeAMomentSection />

      <FromShaktiCard item={fromShakti} />

      <AnnouncementBanner announcement={data.announcement} />
    </ScrollView>
  );
}

function ExploreHome({
  data,
  loading,
  reload,
}: {
  data: HomeResponse | null;
  loading: boolean;
  reload: () => void;
}) {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const fromShakti = data ? pickFromShakti(data) : null;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      {isStaff && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.sage }}>
          <Heading size="sm">{user?.role === "teacher" ? "Teacher Portal" : "Admin Console"}</Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            Manage batches, view student attendance and publish content via the web console.
          </BodyText>
          <Button onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/admin`)}>
            Open Web Console
          </Button>
        </Card>
      )}

      <VisitorHeroSection />

      <TakeAMomentSection />

      {fromShakti && <FromShaktiCard item={fromShakti} />}

      <TeaserRow
        icon="chatbubble-ellipses-outline"
        label="Success Stories & Reviews"
        subtitle="Transformations from practitioners worldwide"
        onPress={() => router.push("/testimonials")}
      />

      {data && <AnnouncementBanner announcement={data.announcement} />}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(() => api.get<HomeResponse>("/api/me/home"), []);

  // Session balance / therapy credits can change on another tab (joining a
  // class, cancelling a therapy session) — refetch whenever Home regains
  // focus so those numbers don't sit stale until a cold restart. Skips the
  // very first focus (the mount-time useResource fetch already covers it).
  const mounted = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (mounted.current) reload();
      mounted.current = true;
    }, [reload]),
  );

  const role = user?.role;
  const isEveryday = role === "member_everyday" || role === "member_starter" || role === "trial";
  const isTherapy = role === "member_therapy";

  return (
    <Screen>
      <HomeHeader
        userName={user?.name}
        unreadNotifications={data?.activity.unreadCount ?? 0}
      />

      {!data && loading ? (
        <LoadingView />
      ) : !data && error ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <EmptyState title="Couldn't load your home sanctuary" subtitle={error} />
          <Button variant="outline" onPress={reload} style={{ marginTop: spacing.md }}>
            Tap to Refresh
          </Button>
        </View>
      ) : isTherapy ? (
        <TherapyHome data={data!} loading={loading} reload={reload} />
      ) : isEveryday ? (
        <EverydayHome data={data!} loading={loading} reload={reload} />
      ) : (
        <ExploreHome data={data} loading={loading} reload={reload} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  paywallCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    alignItems: "center",
    ...shadows.card,
  },
  paywallIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  therapyJourneyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  therapyJourneyContent: {
    flex: 1,
  },
  therapyEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.secondary,
  },
  therapyJourneyArrow: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  teaserPressable: {
    marginBottom: 2,
  },
  teaserCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  teaserIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  teaserLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  teaserSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
