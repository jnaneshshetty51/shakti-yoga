import React from "react";
import { ScrollView, View, Pressable, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, Heading } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing } from "@/theme";

function Row({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <BodyText muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</BodyText>
        <BodyText>{value}</BodyText>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </Pressable>
  );
}

export default function ContactScreen() {
  return (
    <Screen>
      <ScreenHeader title="Contact Shakti" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Heading size="md" style={{ marginBottom: spacing.md }}>We&rsquo;re here to help</Heading>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Row icon="logo-whatsapp" label="WhatsApp" value="+91 77602 22478" onPress={() => Linking.openURL("https://wa.me/917760222478")} />
          <Row icon="call-outline" label="Phone" value="+91 77602 22478" onPress={() => Linking.openURL("tel:+917760222478")} />
          <Row icon="mail-outline" label="Email" value="contactus@shaktiyoga.in" onPress={() => Linking.openURL("mailto:contactus@shaktiyoga.in")} />
          <Row icon="globe-outline" label="Website" value="shaktiyoga.in" onPress={() => Linking.openURL("https://shaktiyoga.in")} />
        </Card>
        <BodyText muted style={{ marginTop: spacing.md, fontSize: 12 }}>
          For account questions, use in-app Support (More → Support) so a Shakti team member can see your details.
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#0001",
  },
});
