import React from "react";
import { View, ScrollView, Pressable, Linking, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme";

function Row({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 28 }} />
      <BodyText style={{ flex: 1 }}>{label}</BodyText>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const isMember = user?.role === "member_everyday" || user?.role === "member_therapy" || user?.role === "trial";

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">More</Heading>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isMember && (
          <Card style={styles.section}>
            <Row icon="card-outline" label="Membership" onPress={() => router.push("/membership")} />
            <Row icon="gift-outline" label="Refer & Earn" onPress={() => router.push("/refer")} />
            <Row icon="people-outline" label="Family" onPress={() => router.push("/family")} />
          </Card>
        )}

        <Card style={styles.section}>
          <Row icon="person-outline" label="Profile" onPress={() => router.push("/profile")} />
          <Row
            icon="logo-whatsapp"
            label="Support"
            onPress={() => Linking.openURL("https://wa.me/917760222478")}
          />
        </Card>

        <Card style={styles.section}>
          <Row icon="log-out-outline" label="Log out" onPress={logout} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  section: { marginBottom: spacing.md, padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#0001",
  },
});
