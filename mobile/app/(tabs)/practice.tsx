import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen, Heading, BodyText, Card, Badge, Button, LoadingView, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

interface Practice {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number;
  videoUrl: string | null;
  done: boolean;
}

export default function PracticeScreen() {
  const { data, loading, error } = useResource(() => api.get<{ practices: Practice[] }>("/api/practices"), []);

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">Practice</Heading>
        <BodyText muted>Take a moment, even without a live class.</BodyText>
      </View>
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load practices" subtitle={error} />
      ) : (
        <FlatList
          data={data?.practices ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<EmptyState title="Nothing here yet" subtitle="New practices are added regularly." />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <BodyText style={{ fontWeight: "700", flex: 1 }}>{item.title}</BodyText>
                {item.done && <Badge tone="success">Done</Badge>}
              </View>
              <BodyText muted style={{ marginTop: 2 }}>{item.category} · {item.durationMin} min</BodyText>
              {item.description && <BodyText style={{ marginTop: spacing.xs }}>{item.description}</BodyText>}
              {item.videoUrl && (
                <Button
                  variant="outline"
                  style={{ marginTop: spacing.sm }}
                  onPress={() => WebBrowser.openBrowserAsync(item.videoUrl!)}
                >
                  Watch
                </Button>
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
