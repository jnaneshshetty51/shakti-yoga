import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Heading } from "@/components/ui";
import { colors, spacing } from "@/theme";

/** Simple back-button header for screens pushed outside the tab bar. */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
      <Heading size="md">{title}</Heading>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  back: { padding: spacing.xs, marginLeft: -spacing.xs },
});
