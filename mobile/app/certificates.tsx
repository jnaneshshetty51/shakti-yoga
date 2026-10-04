import React, { useState } from "react";
import { ScrollView, View, Pressable, StyleSheet, Alert } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CertificatePreview } from "@/components/CertificatePreview";
import { api, getToken, API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius, shadows } from "@/theme";

interface Certificate {
  id: string;
  title: string;
  reason: string | null;
  verificationCode: string;
  approvedAt: string | null;
  issuedAt: string;
}

export default function CertificatesScreen() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => api.get<{ certificates: Certificate[] }>("/api/certificates"),
    [],
  );
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

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

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", `Verification code ${code} copied to clipboard.`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <Screen>
      <ScreenHeader title="My Certificates" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load certificates" subtitle={error} onRetry={reload} />
      ) : !data || data.certificates.length === 0 ? (
        <EmptyState
          title="No certificates yet"
          subtitle="Complete a challenge or reach a milestone to earn your first certificate."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="ribbon" size={24} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading size="sm" style={{ color: colors.primary }}>
                {data.certificates.length} Certificate{data.certificates.length !== 1 ? "s" : ""}
              </Heading>
              <BodyText muted style={{ fontSize: 12, marginTop: 2 }}>
                Your achievements in your yoga journey
              </BodyText>
            </View>
          </View>

          {/* Certificates */}
          {data.certificates.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setPreviewCert(c)}
              style={({ pressed }) => pressed && { opacity: 0.9 }}
            >
              <Card style={styles.certCard}>
                {/* Accent bar */}
                <View style={styles.accentBar} />

                <View style={styles.certContent}>
                  {/* Icon + Badge */}
                  <View style={styles.certHeader}>
                    <View style={styles.certIconCircle}>
                      <Ionicons name="trophy" size={18} color={colors.primary} />
                    </View>
                    <Badge tone="success">EARNED</Badge>
                  </View>

                  {/* Title */}
                  <Heading size="sm" style={styles.certTitle}>
                    {c.title}
                  </Heading>

                  {/* Reason */}
                  {c.reason && (
                    <BodyText muted style={styles.certReason} numberOfLines={2}>
                      {c.reason}
                    </BodyText>
                  )}

                  {/* Date + Code */}
                  <View style={styles.certMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                      <BodyText muted style={styles.metaText}>
                        {formatDate(c.approvedAt ?? c.issuedAt)}
                      </BodyText>
                    </View>

                    <Pressable
                      onPress={() => copyCode(c.verificationCode)}
                      style={styles.metaItem}
                    >
                      <Ionicons name="copy-outline" size={14} color={colors.primary} />
                      <BodyText style={[styles.metaText, { color: colors.primary, fontWeight: "600" }]}>
                        {c.verificationCode}
                      </BodyText>
                    </Pressable>
                  </View>

                  {/* Actions */}
                  <View style={styles.certActions}>
                    <Button
                      variant="outline"
                      onPress={() => setPreviewCert(c)}
                      style={{ flex: 1 }}
                    >
                      Preview
                    </Button>
                    <Button
                      loading={downloading === c.id}
                      onPress={() => download(c)}
                      style={{ flex: 1 }}
                    >
                      Download
                    </Button>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Preview modal */}
      {previewCert && (
        <CertificatePreview
          certificate={previewCert}
          memberName={user?.name ?? ""}
          visible
          onClose={() => setPreviewCert(null)}
          onDownload={() => download(previewCert)}
          downloading={downloading === previewCert.id}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.sage,
    borderRadius: radius.card,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  certCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
    backgroundColor: colors.secondary,
  },
  certContent: {
    flex: 1,
    padding: spacing.md,
  },
  certHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  certIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  certTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  certReason: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  certMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  certActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
