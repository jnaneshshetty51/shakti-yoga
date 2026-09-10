import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { user } = useAuth();
  const isTherapy = user?.role === "member_therapy";
  const isVisitor = !user || user.role === "visitor";

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
        options={{
          title: isTherapy ? "My Therapy" : "Classes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isTherapy ? "medkit-outline" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: "Explore", tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          href: isVisitor ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
