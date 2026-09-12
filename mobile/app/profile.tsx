import React, { useEffect, useState } from "react";
import { View, ScrollView, TextInput, Pressable, StyleSheet, Alert, Image, Platform } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, Button, LoadingView } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, API_URL, getToken } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface ProfileResponse {
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  timezone: string;
  avatarUrl: string | null;
  profile: { goals: string | null; communicationPref: string | null } | null;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <BodyText muted style={styles.label}>{label}</BodyText>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

export default function ProfileScreen() {
  const { logout, refreshUser } = useAuth();
  const { data, loading, reload } = useResource(() => api.get<ProfileResponse>("/api/profile"), []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", country: "", timezone: "", goals: "", communicationPref: "" });
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name, phone: data.phone ?? "", country: data.country ?? "", timezone: data.timezone,
        goals: data.profile?.goals ?? "", communicationPref: data.profile?.communicationPref ?? "",
      });
      setAvatar(data.avatarUrl);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/api/profile", {
        name: form.name.trim(), phone: form.phone.trim() || null, country: form.country.trim() || null,
        timezone: form.timezone.trim() || undefined,
        goals: form.goals.trim() || null, communicationPref: form.communicationPref.trim() || null,
      });
      await refreshUser();
      setEditing(false);
      reload();
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const fd = new FormData();
    // @ts-expect-error React Native FormData file shape
    fd.append("file", { uri: asset.uri, name: asset.fileName ?? "avatar.jpg", type: asset.mimeType ?? "image/jpeg" });
    try {
      const token = await getToken();
      const r = await fetch(`${API_URL}/api/profile/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || "Upload failed");
      setAvatar(body.avatarUrl);
      await refreshUser();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const doDelete = async () => {
    try {
      await api.del("/api/profile");
      await logout();
      router.replace("/(auth)/welcome");
    } catch (e) {
      Alert.alert("Couldn't delete", e instanceof ApiError ? e.message : "Contact support.");
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === "ios" && Alert.prompt) {
      Alert.prompt(
        "Delete account?",
        "This permanently deletes your account and data. Type DELETE to confirm.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: (text?: string) => {
              if (text === "DELETE") doDelete();
              else Alert.alert("Not deleted", "You didn't type DELETE.");
            },
          },
        ],
        "plain-text",
      );
    } else {
      Alert.alert("Delete account?", "This permanently deletes your account and data. This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: () =>
            Alert.alert("Are you absolutely sure?", "Last chance — your account will be gone.", [
              { text: "Keep my account", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: doDelete },
            ]),
        },
      ]);
    }
  };

  if (loading) return <Screen><ScreenHeader title="Profile" /><LoadingView /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
          <Pressable onPress={pickAvatar}>
            {avatar ? (
              <Image
                accessibilityLabel="Profile photo"
                source={{ uri: avatar.startsWith("http") ? avatar : `${API_URL}${avatar}` }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="camera-outline" size={24} color={colors.muted} /></View>
            )}
          </Pressable>
          <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }}>Tap to change photo</BodyText>
        </View>

        {editing ? (
          <Card style={{ marginBottom: spacing.md }}>
            <Field label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <Field label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <Field label="Country" value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} />
            <Field label="Timezone" value={form.timezone} onChangeText={(v) => setForm({ ...form, timezone: v })} placeholder="IST" />
            <Field label="Your goals (optional)" value={form.goals} onChangeText={(v) => setForm({ ...form, goals: v })} multiline />
            <Field label="Preferred contact (Email / WhatsApp / Phone)" value={form.communicationPref} onChangeText={(v) => setForm({ ...form, communicationPref: v })} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button loading={saving} onPress={save} style={{ flex: 1 }}>Save</Button>
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: spacing.md }}>
            <Info label="Name" value={data?.name ?? ""} />
            <Info label="Email" value={data?.email ?? ""} />
            <Info label="Phone" value={data?.phone ?? "—"} />
            <Info label="Country" value={data?.country ?? "—"} />
            <Button variant="outline" style={{ marginTop: spacing.xs }} onPress={() => setEditing(true)}>Edit profile</Button>
          </Card>
        )}

        <Card style={{ padding: 0, overflow: "hidden", marginBottom: spacing.md }}>
          <LinkRow icon="shield-checkmark-outline" label="Account security" onPress={() => router.push("/account-security")} />
          <LinkRow icon="options-outline" label="Consent & permissions" onPress={() => router.push("/consent")} />
        </Card>

        <Button variant="outline" onPress={() => Alert.alert("Log out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: logout }])} style={{ marginBottom: spacing.sm }}>
          Log out
        </Button>
        <Button variant="ghost" onPress={confirmDelete}>Delete account</Button>
      </ScrollView>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <BodyText muted style={styles.label}>{label}</BodyText>
      <BodyText>{value || "—"}</BodyText>
    </View>
  );
}
function LinkRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 28 }} />
      <BodyText style={{ flex: 1 }}>{label}</BodyText>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.white,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarEmpty: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  linkRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
});
