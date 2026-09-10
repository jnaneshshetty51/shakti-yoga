import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { router, Link } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { useAuth, ApiError } from "@/context/AuthContext";
import { colors, spacing, radius } from "@/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Heading size="lg">Welcome back</Heading>
      <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Log in to continue your practice.
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
      <View style={styles.field}>
        <BodyText style={styles.label}>Password</BodyText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />
      </View>

      <Button onPress={submit} loading={loading} disabled={!email || !password} style={{ marginTop: spacing.sm }}>
        Log In
      </Button>

      <Link href="/(auth)/signup" style={styles.switchLink}>
        <BodyText muted>Don&rsquo;t have an account? <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Sign up</BodyText></BodyText>
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
