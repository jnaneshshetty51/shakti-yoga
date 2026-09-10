import React, { useEffect, type ReactNode } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Reactively keeps the visible screen in sync with auth state — not just on
 * cold start, but on every login/logout too (segments re-evaluate on each
 * navigation, so this also catches "logged out from deep inside the tabs").
 */
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
