import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Screen, LoadingView } from "@/components/ui";
import { spacing } from "@/theme";

const logo = require("../assets/splash.png");

/**
 * The `/` route. `AuthGate` in the root layout does all the redirecting
 * (cold start and every login/logout); this just renders while that resolves.
 */
export default function Index() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.center}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <LoadingView />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 100, height: 100, marginBottom: spacing.lg },
});
