import React from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, BodyText, Button, LoadingView } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PlanList, type PlanRung } from "@/components/PlanList";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

const MEMBER_ROLES = new Set(["member_everyday", "member_starter", "trial"]);

export default function EverydayInfoScreen() {
  const { user } = useAuth();
  const { data, loading } = useResource(() => api.get<{ plans: PlanRung[] }>("/api/plans"), []);
  const plans = (data?.plans ?? []).filter((p) => p.key.startsWith("everyday") || p.key === "starter");
  const isMember = !!user && MEMBER_ROLES.has(user.role);

  const cta = () => {
    if (!user) return router.push("/(auth)/signup");
    if (isMember) return router.push("/(tabs)");
    return router.push("/subscribe");
  };

  return (
    <Screen>
      <ScreenHeader title="Everyday Yoga" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Heading size="lg">Live classes, every day</Heading>
        <BodyText muted style={{ marginTop: spacing.sm }}>
          Join real teachers over Google Meet, Monday to Friday. No booking — turn up to any batch that suits you.
          20 live sessions per billing cycle; unused sessions don&rsquo;t roll over.
        </BodyText>

        <Heading size="sm" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Plans</Heading>
        {loading ? <LoadingView /> : <PlanList plans={plans} />}

        <Button style={{ marginTop: spacing.lg }} onPress={cta}>
          {!user ? "Start Free Trial" : isMember ? "Go to my classes" : "Subscribe"}
        </Button>
      </ScrollView>
    </Screen>
  );
}
