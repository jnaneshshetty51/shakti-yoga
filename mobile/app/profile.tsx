import React from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Screen, BodyText, Card, Button } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { spacing } from "@/theme";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <BodyText muted style={styles.label}>{label}</BodyText>
      <BodyText>{value || "—"}</BodyText>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This can't be undone. Contact support to permanently delete your account and data.",
      [{ text: "Cancel", style: "cancel" }],
    );
  };

  const confirmLogout = () => {
    Alert.alert("Log out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Card style={{ marginBottom: spacing.md }}>
          <Field label="Name" value={user?.name ?? ""} />
          <Field label="Email" value={user?.email ?? ""} />
          <Field label="Phone" value={user?.phone ?? ""} />
          <Field label="Country" value={user?.country ?? ""} />
        </Card>

        <Button variant="outline" onPress={confirmLogout} style={{ marginBottom: spacing.sm }}>Log out</Button>
        <Button variant="ghost" onPress={confirmDelete}>Delete Account</Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
});
