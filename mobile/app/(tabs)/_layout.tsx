import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTherapy = user?.role === "member_therapy";
  const isVisitor = !user || user.role === "visitor";

  // Detect tablet viewport (iPad or Android tablet >= 768px wide)
  const isTablet = width >= 768 || (Platform.OS === "ios" && Platform.isPad);
  const horizontalPadding = isTablet ? Math.max(32, (width - 640) / 2) : 0;
  const iconSize = (defaultSize: number) => (isTablet ? 26 : defaultSize);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: "#FAF8F5",
          ...(isTablet
            ? {
                height: 68,
                paddingBottom: 10,
                paddingTop: 8,
                paddingHorizontal: horizontalPadding,
              }
            : {}),
        },
        tabBarLabelStyle: isTablet
          ? {
              fontSize: 12,
              fontWeight: "600",
              marginTop: 2,
            }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={iconSize(size)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: isTherapy ? "My Therapy" : "Classes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isTherapy ? "medkit-outline" : "calendar-outline"}
              size={iconSize(size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={iconSize(size)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          href: isVisitor ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={iconSize(size)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={iconSize(size)} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
