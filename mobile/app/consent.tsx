import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Pressable, Linking, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import * as Calendar from "expo-calendar";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { biometricAvailable } from "@/lib/appLock";
import { registerForPush, unregisterForPush } from "@/lib/push";
import { colors, spacing } from "@/theme";

type State = "granted" | "denied" | "undetermined" | "unavailable";

function Row({
  icon, label, hint, state, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; state: State; onPress: () => void }) {
  const tone = state === "granted" ? colors.success : state === "denied" ? colors.danger : colors.muted;
  const word = { granted: "On", denied: "Off", undetermined: "Ask", unavailable: "N/A" }[state];
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <BodyText style={{ fontWeight: "700" }}>{label}</BodyText>
        <BodyText muted style={{ fontSize: 12 }}>{hint}</BodyText>
      </View>
      <BodyText style={{ color: tone, fontWeight: "700", fontSize: 12 }}>{word}</BodyText>
    </Pressable>
  );
}

export default function ConsentScreen() {
  const [push, setPush] = useState<State>("undetermined");
  const [cal, setCal] = useState<State>("undetermined");
  const [photos, setPhotos] = useState<State>("undetermined");
  const [bio, setBio] = useState<State>("undetermined");

  const refresh = useCallback(async () => {
    setPush((await Notifications.getPermissionsAsync()).status as State);
    setCal((await Calendar.getCalendarPermissionsAsync()).status as State);
    setPhotos((await ImagePicker.getMediaLibraryPermissionsAsync()).status as State);
    setBio((await biometricAvailable()) ? "granted" : "unavailable");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads OS permission state on mount
  useEffect(() => { refresh(); }, [refresh]);

  const togglePush = async () => {
    if (push === "granted") { await unregisterForPush(); setPush("denied"); return; }
    const res = await Notifications.requestPermissionsAsync();
    if (res.status === "granted") { await registerForPush(); }
    else Linking.openSettings();
    refresh();
  };

  const ask = (current: State, request: () => Promise<{ status: string }>) => async () => {
    if (current === "granted" || current === "denied") { Linking.openSettings(); return; }
    await request();
    refresh();
  };

  return (
    <Screen>
      <ScreenHeader title="Consent & Permissions" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <BodyText muted style={{ marginBottom: spacing.md }}>
          Shakti only asks for what a feature needs. Tap a row to change it — most changes open your phone&rsquo;s settings.
        </BodyText>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Row icon="notifications-outline" label="Notifications" hint="Class reminders, support replies, announcements" state={push} onPress={togglePush} />
          <Row icon="calendar-outline" label="Calendar" hint="Add classes and sessions to your device calendar" state={cal} onPress={ask(cal, Calendar.requestCalendarPermissionsAsync)} />
          <Row icon="image-outline" label="Photos" hint="Set your profile picture" state={photos} onPress={ask(photos, ImagePicker.requestMediaLibraryPermissionsAsync)} />
          <Row icon="finger-print-outline" label="Biometrics" hint="Used for the optional app lock" state={bio} onPress={() => Linking.openSettings()} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#0001",
  },
});
