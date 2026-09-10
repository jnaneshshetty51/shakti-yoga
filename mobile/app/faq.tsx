import React, { useState } from "react";
import { ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing } from "@/theme";

interface Faq {
  id: string;
  question: string;
  answer: string;
}

export default function FaqScreen() {
  const { data, loading, error } = useResource(() => api.get<Faq[]>("/api/content/faqs"), []);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen>
      <ScreenHeader title="Help & FAQ" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load FAQ" subtitle={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No questions yet" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {data.map((f) => {
            const expanded = open === f.id;
            return (
              <Card key={f.id} style={{ marginBottom: spacing.sm }}>
                <Pressable onPress={() => setOpen(expanded ? null : f.id)} style={styles.row}>
                  <BodyText style={{ fontWeight: "700", flex: 1 }}>{f.question}</BodyText>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
                </Pressable>
                {expanded && <BodyText muted style={{ marginTop: spacing.sm }}>{f.answer}</BodyText>}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
