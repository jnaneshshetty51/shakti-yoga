import React from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, BodyText, Button, LoadingView } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PlanList, type PlanRung } from "@/components/PlanList";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

export default function TherapyInfoScreen() {
  const { data, loading } = useResource(() => api.get<{ plans: PlanRung[] }>("/api/plans"), []);
  const plans = (data?.plans ?? []).filter((p) => p.key.startsWith("therapy"));

  return (
    <Screen>
      <ScreenHeader title="Yoga Therapy" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Heading size="lg">One-to-one, for a real concern</Heading>
        <BodyText muted style={{ marginTop: spacing.sm }}>
          A structured assessment, a consultation, and an assigned therapist who plans and monitors every session.
          20 live individual sessions per cycle. There is no free trial for Yoga Therapy — it starts with an assessment.
        </BodyText>

        <Heading size="sm" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Plans</Heading>
        {loading ? <LoadingView /> : <PlanList plans={plans} />}

        <Button style={{ marginTop: spacing.lg }} onPress={() => router.push("/therapy-intake")}>
          Begin Yoga Therapy Assessment
        </Button>
      </ScrollView>
    </Screen>
  );
}
