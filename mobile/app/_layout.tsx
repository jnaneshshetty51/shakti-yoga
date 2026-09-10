import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { isAppLockOn, authenticateIfLocked } from "@/lib/appLock";
import { spacing } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  return <>{children}</>;
}

/** Biometric app-lock gate — blocks the UI until unlocked, re-locks on background. */
function LockGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const wentBackground = useRef(false);

  const attempt = async () => {
    setBusy(true);
    const ok = await authenticateIfLocked();
    setBusy(false);
    if (ok) setLocked(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- app-lock gate: check on mount + on resume
  useEffect(() => {
    if (!user) { setLocked(false); return; }
    isAppLockOn().then((on) => { if (on) { setLocked(true); attempt(); } });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" || s === "inactive") wentBackground.current = true;
      if (s === "active" && wentBackground.current) {
        wentBackground.current = false;
        isAppLockOn().then((on) => { if (on) { setLocked(true); attempt(); } });
      }
    });
    return () => sub.remove();
  }, [user]);

  return (
    <>
      {children}
      {locked && (
        <Screen style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <Heading size="md">Shakti is locked</Heading>
          <BodyText muted style={{ marginTop: spacing.sm, textAlign: "center" }}>Unlock with Face ID or your passcode.</BodyText>
          <Button loading={busy} style={{ marginTop: spacing.lg }} onPress={attempt}>Unlock</Button>
        </Screen>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <LockGate>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </LockGate>
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
