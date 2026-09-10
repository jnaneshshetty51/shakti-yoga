import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
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
  const isMember =
    user?.role === "member_everyday" ||
    user?.role === "member_starter" ||
    user?.role === "member_therapy" ||
    user?.role === "trial";

  return (
    <Screen>
      <View style={styles.header}>
        <Heading size="lg">More</Heading>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isMember && (
          <Card style={styles.section}>
            <Row icon="card-outline" label="Membership" onPress={() => router.push("/membership")} />
            <Row icon="qr-code-outline" label="Membership Card" onPress={() => router.push("/membership-card")} />
            <Row icon="gift-outline" label="Refer & Earn" onPress={() => router.push("/refer")} />
            <Row icon="people-outline" label="Family" onPress={() => router.push("/family")} />
            <Row icon="ribbon-outline" label="Certificates" onPress={() => router.push("/certificates")} />
          </Card>
        )}

        <Card style={styles.section}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push("/activity")} />
          <Row icon="leaf-outline" label="Practices" onPress={() => router.push("/practices")} />
          <Row icon="trophy-outline" label="Challenges" onPress={() => router.push("/challenges")} />
          <Row icon="calendar-clear-outline" label="Calendar" onPress={() => router.push("/calendar")} />
          <Row icon="sparkles-outline" label="Workshops & Retreats" onPress={() => router.push("/events")} />
          <Row icon="bookmark-outline" label="Saved" onPress={() => router.push("/saved")} />
          {user?.role !== "member_therapy" && (
            <Row icon="medkit-outline" label="Begin Yoga Therapy Assessment" onPress={() => router.push("/therapy-intake")} />
          )}
        </Card>

        <Card style={styles.section}>
          <Row icon="help-circle-outline" label="Help & FAQ" onPress={() => router.push("/faq")} />
          <Row icon="chatbubbles-outline" label="Success Stories" onPress={() => router.push("/testimonials")} />
          <Row icon="call-outline" label="Contact Shakti" onPress={() => router.push("/contact")} />
        </Card>

        <Card style={styles.section}>
          <Row icon="person-outline" label="Profile" onPress={() => router.push("/profile")} />
          <Row icon="chatbubble-ellipses-outline" label="Support" onPress={() => router.push("/support")} />
          <Row icon="shield-checkmark-outline" label="Account Security" onPress={() => router.push("/account-security")} />
          <Row icon="options-outline" label="Consent & Permissions" onPress={() => router.push("/consent")} />
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
