import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Heading } from "@/components/ui";
import { colors, spacing } from "@/theme";

export function ScreenHeader({ title, rightAction }: { title: string; rightAction?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
      <Heading size="md" style={{ flex: 1 }}>{title}</Heading>
      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  back: { padding: spacing.xs, marginLeft: -spacing.xs },
});
