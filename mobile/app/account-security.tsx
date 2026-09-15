import React, { useEffect, useState } from "react";
import { ScrollView, View, Switch, StyleSheet, Alert } from "react-native";
import { Screen, BodyText, Card, Button, Heading } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { api, setToken, ApiError } from "@/lib/api";
import { isAppLockOn, setAppLock, biometricAvailable, authenticateIfLocked } from "@/lib/appLock";
import { spacing, colors } from "@/theme";

export default function AccountSecurityScreen() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [lock, setLock] = useState(false);
  const [bioOk, setBioOk] = useState(true);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);

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

  const logoutOtherSessions = () => {
    Alert.alert(
      "Log out of other devices?",
      "This will end all other active sessions across your web browsers, tablets, and phones. You will remain logged in on this phone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out others",
          onPress: async () => {
            setLoggingOutOthers(true);
            try {
              const res = await api.post<{ ok: boolean; message: string; token: string }>("/api/auth/logout-all");
              if (res.token) {
                await setToken(res.token);
              }
              Alert.alert("Success", res.message || "All other sessions have been logged out.");
            } catch (e) {
              Alert.alert("Error", e instanceof ApiError ? e.message : "Could not log out other sessions. Please try again.");
            } finally {
              setLoggingOutOthers(false);
            }
          },
        },
      ]
    );
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

        <Card style={{ marginBottom: spacing.md }}>
          <Heading size="sm">Active Sessions</Heading>
          <BodyText muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            Signed in on another browser, tablet, or phone? You can immediately revoke all other sessions while staying signed in on this device.
          </BodyText>
          <Button variant="outline" loading={loggingOutOthers} onPress={logoutOtherSessions}>
            Log out of all other sessions
          </Button>
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
