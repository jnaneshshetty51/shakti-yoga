import React, { useEffect, useState } from "react";
import { ScrollView, View, Switch, StyleSheet, Alert } from "react-native";
import { Screen, BodyText, Card, Button, Heading } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { isAppLockOn, setAppLock, biometricAvailable, authenticateIfLocked } from "@/lib/appLock";
import { spacing, colors } from "@/theme";

export default function AccountSecurityScreen() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [lock, setLock] = useState(false);
  const [bioOk, setBioOk] = useState(true);

  useEffect(() => {
    isAppLockOn().then(setLock);
    biometricAvailable().then(setBioOk);
  }, []);

  const changePassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await api.post("/api/auth/forgot-password", { email: user.email }, { anonymous: true });
      setSentReset(true);
    } catch (e) {
      Alert.alert("Couldn't send", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setSendingReset(false);
    }
  };

  const toggleLock = async (next: boolean) => {
    if (next && !bioOk) {
      Alert.alert("Set up biometrics first", "Add Face ID / fingerprint or a device passcode in your phone's settings.");
      return;
    }
    if (next) {
      // verify we can actually authenticate before turning it on
      await setAppLock(true);
      const ok = await authenticateIfLocked();
      if (!ok) { await setAppLock(false); return; }
    } else {
      await setAppLock(false);
    }
    setLock(next);
  };

  return (
    <Screen>
      <ScreenHeader title="Account Security" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Card style={{ marginBottom: spacing.md }}>
          <Heading size="sm">Password</Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            {sentReset
              ? `We've emailed a reset link to ${user?.email}. Open it on any device to set a new password.`
              : "We'll email a secure link to reset your password."}
          </BodyText>
          {!sentReset && (
            <Button variant="outline" loading={sendingReset} onPress={changePassword}>Email me a reset link</Button>
          )}
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <BodyText style={{ fontWeight: "700" }}>Biometric app lock</BodyText>
              <BodyText muted style={{ fontSize: 13 }}>Require Face ID / fingerprint to open the app.</BodyText>
            </View>
            <Switch value={lock} onValueChange={toggleLock} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        <BodyText muted style={{ marginTop: spacing.md, fontSize: 12 }}>
          There&rsquo;s no dedicated &ldquo;sign out of other devices&rdquo; switch — resetting your password above does
          the same thing, ending every other signed-in session (phone, tablet, browser) immediately.
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
