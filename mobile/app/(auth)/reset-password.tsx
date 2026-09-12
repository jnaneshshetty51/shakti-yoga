import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { router, Link, useLocalSearchParams } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius } from "@/theme";

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const token = typeof tokenParam === "string" ? tokenParam : "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password }, { anonymous: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Screen style={styles.screen}>
        <Heading size="lg">Link not found</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          This reset link looks incomplete. Request a new one from the login screen.
        </BodyText>
        <Link href="/(auth)/forgot-password" style={styles.switchLink}>
          <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Request a new link</BodyText>
        </Link>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen style={styles.screen}>
        <Heading size="lg">Password updated</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          You&rsquo;re all set — log in with your new password. This also signs you out everywhere else.
        </BodyText>
        <Button onPress={() => router.replace("/(auth)/login")}>Go to login</Button>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Heading size="lg">Set a new password</Heading>
      <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Choose a new password for your account.
      </BodyText>

      {error && <BodyText style={styles.error}>{error}</BodyText>}

      <View style={styles.field}>
        <BodyText style={styles.label}>New password</BodyText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={styles.field}>
        <BodyText style={styles.label}>Confirm password</BodyText>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />
      </View>

      <Button onPress={submit} loading={loading} disabled={!password || !confirm} style={{ marginTop: spacing.sm }}>
        Reset password
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, justifyContent: "center" },
  field: { marginBottom: spacing.md },
  label: { fontWeight: "700", marginBottom: spacing.xs, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
  switchLink: { marginTop: spacing.lg, alignSelf: "center" },
});
