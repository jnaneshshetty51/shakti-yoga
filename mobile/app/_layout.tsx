import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform, Linking as RNLinking } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { isAppLockOn, authenticateIfLocked } from "@/lib/appLock";
import { resolveNotificationPath, resolveIncomingUrl, isPublicAuthPath } from "@/lib/deepLink";
import { isVersionBelow } from "@/lib/version";
import { api } from "@/lib/api";
import { spacing } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Routes a tapped push notification (cold-start or while running) to the right screen. */
function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!response || isLoading) return;
    const key = response.notification.request.identifier;
    if (handled.current === key) return;
    handled.current = key;
    const data = response.notification.request.content.data as { url?: string } | undefined;
    const path = resolveNotificationPath(data?.url);
    if (user) setTimeout(() => router.push(path), 0);
    else pending.current = path;
  }, [response, user, isLoading, router]);

  useEffect(() => {
    if (user && !isLoading && pending.current) {
      const path = pending.current;
      pending.current = null;
      setTimeout(() => router.push(path), 0);
    }
  }, [user, isLoading, router]);

  return null;
}

/**
 * Routes an incoming Universal/App Link or shaktiyoga:// URL (cold-start or
 * tapped while running) to the right screen. Mirrors NotificationRouter's
 * pending-queue pattern so a link tapped before login replays after auth.
 */
function UrlRouter() {
  const url = Linking.useURL();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!url || isLoading) return;
    if (handled.current === url) return;
    handled.current = url;
    const path = resolveIncomingUrl(url);
    if (path === "/(tabs)") return; // nothing meaningful to route to
    // A referral/reset-password link is for a signed-out visitor — queuing it
    // behind login would mean it never fires for exactly who it's for.
    if (user || isPublicAuthPath(path)) setTimeout(() => router.push(path), 0);
    else pending.current = path;
  }, [url, user, isLoading, router]);

  useEffect(() => {
    if (user && !isLoading && pending.current) {
      const path = pending.current;
      pending.current = null;
      setTimeout(() => router.push(path), 0);
    }
  }, [user, isLoading, router]);

  return null;
}

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

/**
 * Blocks the app with an update prompt if this install is older than the
 * backend's configured minimum. /api/version existed with nothing reading
 * it — no way to force an upgrade if a breaking API change ever shipped.
 * Fails open (never blocks) on a network error — an outage shouldn't lock
 * everyone out of the app.
 */
function VersionGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ minSupportedMobileVersion?: string }>("/api/version")
      .then((d) => {
        if (cancelled || !d.minSupportedMobileVersion) return;
        const installed = Constants.expoConfig?.version ?? "0.0.0";
        // Blocked case: AuthGate never mounts to hide the splash itself.
        if (isVersionBelow(installed, d.minSupportedMobileVersion)) {
          setBlocked(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!blocked) return <>{children}</>;

  const openStore = () => {
    const url =
      Platform.OS === "android"
        ? "https://play.google.com/store/apps/details?id=com.shaktiyoga.app"
        : "https://apps.apple.com/search?term=shakti+yoga";
    RNLinking.openURL(url).catch(() => {});
  };

  return (
    <Screen style={{ alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
      <Heading size="md">Update required</Heading>
      <BodyText muted style={{ marginTop: spacing.sm, textAlign: "center" }}>
        A new version of Shakti Yoga is required to continue. Please update from the {Platform.OS === "android" ? "Play Store" : "App Store"}.
      </BodyText>
      <Button style={{ marginTop: spacing.lg }} onPress={openStore}>Update now</Button>
    </Screen>
  );
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
      <VersionGate>
        <AuthProvider>
          <AuthGate>
            <LockGate>
              <StatusBar style="dark" />
              <NotificationRouter />
              <UrlRouter />
              <Stack screenOptions={{ headerShown: false }} />
            </LockGate>
          </AuthGate>
        </AuthProvider>
      </VersionGate>
    </SafeAreaProvider>
  );
}
