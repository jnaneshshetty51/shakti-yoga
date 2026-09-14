import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { router, Link, useLocalSearchParams } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius } from "@/theme";

export default function ResetPasswordScreen() {
  // Arrives either as a route param (tapped from a deep link the OS handed
  // to expo-router, or navigated to directly) — resolveIncomingUrl in
  // @/lib/deepLink re-attaches it as `?token=...` on the resolved path.
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post<{ message: string }>(
        "/api/auth/reset-password",
        { token, password },
        { anonymous: true },
      );
      setDone(true);
      setTimeout(() => router.replace("/(auth)/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Screen style={styles.screen}>
        <Heading size="lg">Link missing its token</Heading>
        <BodyText muted style={{ marginTop: spacing.sm }}>
          This reset link is missing its token. Please request a new one.
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
        <BodyText muted style={{ marginTop: spacing.sm }}>
          You can now log in with your new password. Redirecting to log in&hellip;
        </BodyText>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Heading size="lg">Choose a new password</Heading>
      <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Make it at least 8 characters.
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
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />
      </View>

      <Button onPress={submit} loading={loading} disabled={!password || !confirmPassword} style={{ marginTop: spacing.sm }}>
        Reset Password
      </Button>

      <Link href="/(auth)/login" style={styles.switchLink}>
        <BodyText muted>Back to <BodyText style={{ color: colors.primary, fontWeight: "700" }}>log in</BodyText></BodyText>
      </Link>
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
