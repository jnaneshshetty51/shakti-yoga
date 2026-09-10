import React, { useState } from "react";
import { ScrollView, View, Alert } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Screen, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, getToken, API_URL } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { spacing } from "@/theme";

interface Certificate {
  id: string;
  title: string;
  reason: string | null;
  verificationCode: string;
  approvedAt: string | null;
  issuedAt: string;
}

export default function CertificatesScreen() {
  const { data, loading, error } = useResource(
    () => api.get<{ certificates: Certificate[] }>("/api/certificates"),
    [],
  );
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (c: Certificate) => {
    setDownloading(c.id);
    try {
      const token = await getToken();
      const dest = new File(Paths.cache, `shakti-certificate-${c.verificationCode}.pdf`);
      const file = await File.downloadFileAsync(`${API_URL}/api/certificates/${c.id}/download`, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        idempotent: true,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        Alert.alert("Downloaded", "Saved to the app cache.");
      }
    } catch {
      Alert.alert("Download failed", "Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="My Certificates" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load certificates" subtitle={error} />
      ) : !data || data.certificates.length === 0 ? (
        <EmptyState title="No certificates yet" subtitle="Complete a challenge to earn your first one." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {data.certificates.map((c) => (
            <Card key={c.id} style={{ marginBottom: spacing.md }}>
              <BodyText style={{ fontWeight: "700" }}>{c.title}</BodyText>
              {c.reason && <BodyText muted style={{ marginTop: spacing.xs }}>{c.reason}</BodyText>}
              <BodyText muted style={{ fontSize: 12, marginTop: spacing.xs }}>
                Issued{" "}
                {new Date(c.approvedAt ?? c.issuedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </BodyText>
              <View style={{ marginTop: spacing.sm }}>
                <Button loading={downloading === c.id} onPress={() => download(c)}>
                  Download & Share
                </Button>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
