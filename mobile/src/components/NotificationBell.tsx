import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

/** Header bell that opens the activity screen, with an unread-count badge. */
export function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <Pressable
      onPress={() => router.push("/activity")}
      hitSlop={12}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 4 },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
});
