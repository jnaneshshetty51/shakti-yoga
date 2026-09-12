import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Linking } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { HomeHeader } from "@/components/HomeHeader";
import { QuickCategoryBar } from "@/components/QuickCategoryBar";
import { HeroClassCard } from "@/components/HeroClassCard";
import { DailyRitualCard } from "@/components/DailyRitualCard";
import { StreakCard } from "@/components/StreakCard";
import { TeacherWisdomCard } from "@/components/TeacherWisdomCard";
import { VisitorHeroSection } from "@/components/VisitorHeroSection";
import { SessionBalanceCard } from "@/components/SessionBalanceCard";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ChallengeCard } from "@/components/ChallengeCard";
import { ContentRail } from "@/components/ContentRail";
import { useAuth } from "@/context/AuthContext";
import { api, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useJoin } from "@/lib/useJoin";
import { colors, spacing, radius, shadows } from "@/theme";
import type { HomeResponse, FeedItem } from "@/lib/types";

function discoveryItems(data: HomeResponse): FeedItem[] {
  return [data.content.featuredReel, ...data.content.forYou].filter((x): x is FeedItem => Boolean(x));
}

function CommunityCard({ community }: { community: HomeResponse["community"] }) {
  if (!community) return null;
  return (
    <Pressable onPress={() => Linking.openURL(community.whatsappLink)}>
      <Card style={styles.communityCard}>
        <View style={styles.communityRow}>
          <View style={styles.whatsappIconCircle}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <BodyText style={{ fontWeight: "700", color: colors.primary, fontSize: 15 }}>
              {community.name}
            </BodyText>
            {community.pinnedMessage ? (
              <BodyText muted style={{ marginTop: 2, fontSize: 12 }} numberOfLines={2}>
                {community.pinnedMessage}
              </BodyText>
            ) : (
              <BodyText muted style={{ marginTop: 2, fontSize: 12 }}>
                Connect with fellow practitioners across 14+ countries
              </BodyText>
            )}
          </View>
          <Ionicons name="open-outline" size={16} color={colors.secondary} />
        </View>
      </Card>
    </Pressable>
  );
}

function DiscoverySections({ data }: { data: HomeResponse }) {
  const rec = data.content.recommended;
  const items = discoveryItems(data);

  if (items.length === 0 && (!rec || rec.items.length === 0)) return null;

  return (
    <View style={{ marginTop: spacing.xs }}>
      {items.length > 0 && <ContentRail title="Curated from Shakti" items={items} />}
      {rec && rec.items.length > 0 && (
        <ContentRail title={`Because you explore ${rec.category.toLowerCase()}`} items={rec.items} />
      )}
    </View>
  );
}

function ExploreLinks() {
  return (
    <View style={styles.exploreSection}>
      <Heading size="sm" style={styles.exploreHeading}>
        Explore Shakti Kendra
      </Heading>
      <View style={styles.exploreGrid}>
        <TeaserRow
          icon="book-outline"
          label="Read & Watch Library"
          subtitle="Articles, reels & wisdom"
          onPress={() => router.push("/(tabs)/practice")}
        />
        <TeaserRow
          icon="trophy-outline"
          label="Monthly Challenges"
          subtitle="Join 21-day community goals"
          onPress={() => router.push("/challenges")}
        />
        <TeaserRow
          icon="calendar-outline"
          label="Workshops & Retreats"
          subtitle="In-person & online immersions"
          onPress={() => router.push("/events")}
        />
        <TeaserRow
          icon="help-circle-outline"
          label="Help & Knowledge Base"
          subtitle="Answers to common questions"
          onPress={() => router.push("/faq")}
        />
      </View>
    </View>
  );
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

  // Paywall or session exhausted state
  if (!c.access.ok) {
    const { outOfSessions, paywall, reason } = c.access;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
      >
        <QuickCategoryBar />
        <AnnouncementBanner announcement={data.announcement} />
        
        <Card style={styles.paywallCard}>
          <View style={styles.paywallIcon}>
            <Ionicons name="sparkles-outline" size={24} color={colors.secondary} />
          </View>
          <Heading size="sm" style={{ textAlign: "center" }}>
            {outOfSessions
              ? "You've completed all your sessions"
              : paywall
              ? isTrial
                ? "Your free trial class is complete"
                : "Your membership has ended"
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
            <Button onPress={() => router.push(isTrial ? "/info/everyday" : "/membership")}>
              {isTrial ? "Choose a Plan to Continue" : "Renew Membership"}
            </Button>
          ) : null}
        </Card>

        <SessionBalanceCard balance={c.sessionBalance} style={{ marginTop: spacing.md }} />
        <DailyRitualCard />
        <DiscoverySections data={data} />
        <CommunityCard community={data.community} />
        <ExploreLinks />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <QuickCategoryBar />
      <AnnouncementBanner announcement={data.announcement} />

      {/* Hero Next Class Card */}
      <HeroClassCard
        nextClass={c.next}
        isTrial={isTrial}
        joiningId={joiningId}
        onJoinClass={joinClass}
        restTodayCount={c.restToday.length}
      />

      {/* Daily Micro-Practice Ritual */}
      <DailyRitualCard />

      {/* Session Balance & Weekly Consistency Streak */}
      {!isTrial && <SessionBalanceCard balance={c.sessionBalance} style={{ marginBottom: spacing.lg }} />}
      <StreakCard streak={data.streak} />

      {/* Active Community Challenge */}
      <ChallengeCard challenge={data.activeChallenge} />

      {/* Teacher Lineage & Mindful Reflections */}
      <TeacherWisdomCard />

      {/* Curated Content Rails */}
      <DiscoverySections data={data} />

      {/* International WhatsApp Sangha */}
      <CommunityCard community={data.community} />

      {/* Explore & Library Links */}
      <ExploreLinks />
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
      <QuickCategoryBar />
      <AnnouncementBanner announcement={data.announcement} />

      {/* Hero Therapy 1:1 Session Card */}
      <HeroClassCard
        nextTherapy={t.next}
        joiningId={joiningId}
        onJoinTherapy={joinBooking}
      />

      {/* Daily Breath & Reset */}
      <DailyRitualCard />

      {/* Therapy Journey Card */}
      <Pressable onPress={() => router.push("/therapy")} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Card style={styles.therapyJourneyCard}>
          <View style={styles.therapyJourneyContent}>
            <BodyText style={styles.therapyEyebrow}>YOUR THERAPY JOURNEY</BodyText>
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

      {/* Active Challenge */}
      <ChallengeCard challenge={data.activeChallenge} />

      {/* Teacher Wisdom */}
      <TeacherWisdomCard />

      {/* Curated Content */}
      <DiscoverySections data={data} />

      {/* International WhatsApp Circle */}
      <CommunityCard community={data.community} />

      {/* Explore Links */}
      <ExploreLinks />
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

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <QuickCategoryBar />

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

      {/* World-Class Visitor Showcase */}
      <VisitorHeroSection />

      {/* Daily Micro-Practice Teaser */}
      <DailyRitualCard />

      {/* Lineage Reflections */}
      <TeacherWisdomCard />

      {/* Curated Public Feeds */}
      {data && <DiscoverySections data={data} />}

      {/* Explore Section */}
      <ExploreLinks />

      <TeaserRow
        icon="chatbubble-ellipses-outline"
        label="Success Stories & Reviews"
        subtitle="Transformations from practitioners worldwide"
        onPress={() => router.push("/testimonials")}
      />
      <TeaserRow
        icon="call-outline"
        label="Contact Shakti Kendra"
        subtitle="Speak directly with our wellness advisors"
        onPress={() => router.push("/contact")}
      />
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
      {/* Serene Sanctuary Header */}
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
  communityCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  whatsappIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "#25D36615",
    alignItems: "center",
    justifyContent: "center",
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
  exploreSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  exploreHeading: {
    fontSize: 18,
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  exploreGrid: {
    gap: spacing.sm,
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
