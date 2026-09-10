import React from "react";
import { View, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Screen, Heading, BodyText, Button } from "@/components/ui";
import { spacing } from "@/theme";

export default function WelcomeScreen() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Heading size="xl" style={styles.title}>Shakti Yoga Kendra</Heading>
        <BodyText style={styles.tagline}>Authentic Yoga from India, for the World.</BodyText>
      </View>

      <View style={styles.actions}>
        <Link href="/(auth)/signup" asChild>
          <Button>Create Account</Button>
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button variant="outline">Login</Button>
        </Link>
        <Link href="/(tabs)" asChild>
          <Button variant="ghost">Explore Shakti</Button>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.xl },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center" },
  tagline: { textAlign: "center", marginTop: spacing.sm, fontSize: 16 },
  actions: { gap: spacing.sm },
});
