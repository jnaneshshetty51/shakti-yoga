import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius } from "@/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() }, { anonymous: true });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset link. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Screen style={styles.screen}>
        <Heading size="lg">Check your email</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          If an account exists for {email.trim()}, we&rsquo;ve sent a password reset link. Open it on this device or
          any other to set a new password.
        </BodyText>
        <Link href="/(auth)/login" style={styles.switchLink}>
          <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Back to log in</BodyText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Heading size="lg">Reset your password</Heading>
      <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Enter your account email and we&rsquo;ll send you a link to set a new password.
      </BodyText>

      {error && <BodyText style={styles.error}>{error}</BodyText>}

      <View style={styles.field}>
        <BodyText style={styles.label}>Email</BodyText>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
        />
      </View>

      <Button onPress={submit} loading={loading} disabled={!email} style={{ marginTop: spacing.sm }}>
        Send reset link
      </Button>

      <Link href="/(auth)/login" style={styles.switchLink}>
        <BodyText muted>Remembered it? <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Log in</BodyText></BodyText>
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
