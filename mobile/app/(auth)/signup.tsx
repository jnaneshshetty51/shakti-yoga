import React, { useState } from "react";
import { View, TextInput, StyleSheet, ScrollView } from "react-native";
import { router, Link } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { useAuth, ApiError } from "@/context/AuthContext";
import { colors, spacing, radius } from "@/theme";

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <BodyText style={styles.label}>{label}</BodyText>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

export default function SignupScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = firstName && lastName && email && password.length >= 8;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password,
        country: country || undefined,
        phone: phone || undefined,
      });
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Heading size="lg">Create your account</Heading>
        <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          You don&rsquo;t have to pick a program yet — explore first if you like.
        </BodyText>

        {error && <BodyText style={styles.error}>{error}</BodyText>}

        <View style={styles.row}>
          <Field label="First name" value={firstName} onChangeText={setFirstName} style={{ flex: 1 }} />
          <Field label="Last name" value={lastName} onChangeText={setLastName} style={{ flex: 1 }} />
        </View>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Country (optional)" value={country} onChangeText={setCountry} />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />

        <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }}>
          By continuing you agree to Shakti&rsquo;s Terms, Privacy Policy and Refund Policy.
        </BodyText>

        <Button onPress={submit} loading={loading} disabled={!canSubmit} style={{ marginTop: spacing.md }}>
          Create Account
        </Button>

        <Link href="/(auth)/login" style={styles.switchLink}>
          <BodyText muted>Already have an account? <BodyText style={{ color: colors.primary, fontWeight: "700" }}>Log in</BodyText></BodyText>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm },
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
