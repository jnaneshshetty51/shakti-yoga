import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="classes"
        options={{ title: "Classes", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: "Practice", tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: "Progress", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
