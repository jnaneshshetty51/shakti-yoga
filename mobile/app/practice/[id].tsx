import React, { useState } from "react";
import { ScrollView, View, Image, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { mediaUri } from "@/lib/media";
import { LEVEL_LABEL, categoryLabel } from "@/lib/practice";
import { toParagraphs, toSteps } from "@/lib/text";
import { colors, spacing, radius } from "@/theme";
import type { PracticeView } from "@/lib/types";

export default function PracticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useResource(
    () => api.get<{ practice: PracticeView }>(`/api/practices/${id}`),
    [id],
  );
  const p = data?.practice;

  const [done, setDone] = useState(false);
  const [marking, setMarking] = useState(false);
  const completed = done || Boolean(p?.completed);

  const markDone = async () => {
    setMarking(true);
    try {
      const res = await api.post<{ ok: boolean; earned: { title?: string; name?: string }[] }>(
        `/api/practices/${id}/complete`,
      );
      setDone(true);
      const names = (res.earned ?? []).map((e) => e.title || e.name).filter(Boolean);
      if (names.length) Alert.alert("Achievement unlocked", names.join("\n"));
    } catch {
      Alert.alert("Couldn't save", "Please try again in a moment.");
    } finally {
      setMarking(false);
    }
  };

  const thumb = mediaUri(p?.thumbnailUrl);
  const steps = toSteps(p?.steps);
  const paragraphs = toParagraphs(p?.description);

  return (
    <Screen>
      <ScreenHeader title="Practice" />
      {loading ? (
        <LoadingView />
      ) : error || !p ? (
        <EmptyState title="Not found" subtitle={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {thumb ? <Image source={{ uri: thumb }} style={styles.hero} /> : null}
          <Heading size="lg" style={{ marginTop: thumb ? spacing.md : 0 }}>{p.title}</Heading>
          <View style={styles.metaRow}>
            <Badge>{LEVEL_LABEL[p.level]}</Badge>
            <BodyText muted style={{ fontSize: 13 }}>{p.durationMin} min · {categoryLabel(p.category)}</BodyText>
          </View>

          {paragraphs.map((para, i) => (
            <BodyText key={i} style={{ marginTop: spacing.md, fontSize: 15, lineHeight: 23 }}>{para}</BodyText>
          ))}

          {steps.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Heading size="sm" style={{ marginBottom: spacing.sm }}>How to practise</Heading>
              {steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <BodyText style={styles.stepNum}>{i + 1}</BodyText>
                  <BodyText style={{ flex: 1 }}>{s}</BodyText>
                </View>
              ))}
            </View>
          )}

          {p.videoUrl ? (
            <Button style={{ marginTop: spacing.lg }} onPress={() => WebBrowser.openBrowserAsync(p.videoUrl!)}>
              Watch the video
            </Button>
          ) : null}

          {completed ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <BodyText style={{ fontWeight: "700", color: colors.primary }}>Practised</BodyText>
            </View>
          ) : (
            <Button variant="outline" style={{ marginTop: spacing.md }} loading={marking} onPress={markDone}>
              Mark as done
            </Button>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 200, borderRadius: radius.card, backgroundColor: colors.border },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  step: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, alignItems: "flex-start" },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    overflow: "hidden",
  },
  doneRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.lg, justifyContent: "center" },
});
