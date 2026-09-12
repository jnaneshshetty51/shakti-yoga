import React, { type ReactNode } from "react";
import {
  View,
  Text as RNText,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, shadows } from "@/theme";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

export function Heading({ children, style, size = "lg" }: { children: ReactNode; style?: StyleProp<TextStyle>; size?: "sm" | "md" | "lg" | "xl" }) {
  const fontSize = { sm: 16, md: 20, lg: 26, xl: 32 }[size];
  return <RNText style={[{ fontSize, fontWeight: "700", color: colors.primary }, style]}>{children}</RNText>;
}

export function BodyText({
  children,
  style,
  muted = false,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  numberOfLines?: number;
}) {
  return (
    <RNText numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </RNText>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  { children, onPress, variant = "primary", disabled, loading, style },
  ref,
) {
  const isDisabled = disabled || loading;
  const textColor = variant === "outline" ? colors.primary : variant === "ghost" ? colors.muted : colors.white;
  return (
    <Pressable
      ref={ref}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: colors.primary },
        variant === "secondary" && { backgroundColor: colors.secondary },
        variant === "outline" && { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
        variant === "ghost" && { backgroundColor: "transparent" },
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <RNText style={[styles.buttonText, { color: textColor }]}>{children}</RNText>
      )}
    </Pressable>
  );
});

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneColor = { neutral: colors.muted, success: colors.success, warning: colors.warning, danger: colors.danger }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: `${toneColor}1A`, borderColor: `${toneColor}40` }]}>
      <RNText style={[styles.badgeText, { color: toneColor }]}>{children}</RNText>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Heading size="sm" style={{ textAlign: "center" }}>{title}</Heading>
      {subtitle && <BodyText muted style={{ textAlign: "center", marginTop: spacing.xs }}>{subtitle}</BodyText>}
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  button: {
    borderRadius: radius.control,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
