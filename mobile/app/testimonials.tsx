import React from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing } from "@/theme";

interface Testimonial {
  id: string;
  authorName: string;
  location: string | null;
  planType: string | null;
  quote: string;
  rating: number;
  imageUrl: string | null;
}

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= n ? "star" : "star-outline"} size={14} color={colors.secondary} />
      ))}
    </View>
  );
}

export default function TestimonialsScreen() {
  const { data, loading, error } = useResource(() => api.get<Testimonial[]>("/api/content/testimonials"), []);

  return (
    <Screen>
      <ScreenHeader title="Success Stories" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load stories" subtitle={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No stories yet" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {data.map((t) => (
            <Card key={t.id} style={{ marginBottom: spacing.md }}>
              <Stars n={t.rating} />
              <BodyText style={{ marginTop: spacing.sm, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</BodyText>
              <BodyText muted style={{ marginTop: spacing.sm, fontSize: 13 }}>
                {t.authorName}
                {t.location ? ` · ${t.location}` : ""}
                {t.planType ? ` · ${t.planType}` : ""}
              </BodyText>
            </Card>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
