import React from "react";
import { View, Modal, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Button } from "@/components/ui";
import { QRCode } from "@/components/QRCode";
import { colors, spacing, radius, shadows } from "@/theme";

interface Certificate {
  id: string;
  title: string;
  reason: string | null;
  verificationCode: string;
  approvedAt: string | null;
  issuedAt: string;
}

interface Props {
  certificate: Certificate;
  memberName: string;
  visible: boolean;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}

export function CertificatePreview({
  certificate,
  memberName,
  visible,
  onClose,
  onDownload,
  downloading,
}: Props) {
  const issuedDate = new Date(
    certificate.approvedAt ?? certificate.issuedAt
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Certificate Card */}
          <View style={styles.certificateCard}>
            {/* Decorative top border */}
            <View style={styles.topBorder} />

            {/* Inner ornamental frame */}
            <View style={styles.innerFrame}>
              {/* Logo area */}
              <View style={styles.logoArea}>
                <View style={styles.logoCircle}>
                  <Ionicons
                    name="leaf"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <BodyText style={styles.orgName}>
                  SHAKTI YOGA KENDRA
                </BodyText>
              </View>

              {/* Certificate type */}
              <BodyText style={styles.certType}>CERTIFICATE OF</BodyText>
              <Heading size="lg" style={styles.certTitle}>
                {certificate.title}
              </Heading>

              {/* Decorative divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Ionicons
                  name="flower-outline"
                  size={18}
                  color={colors.secondary}
                />
                <View style={styles.dividerLine} />
              </View>

              {/* Presented to */}
              <BodyText style={styles.presentedTo}>
                This certificate is proudly presented to
              </BodyText>
              <Heading size="xl" style={styles.memberName}>
                {memberName}
              </Heading>

              {/* Reason */}
              {certificate.reason && (
                <BodyText style={styles.reason}>
                  {certificate.reason}
                </BodyText>
              )}

              {/* Date */}
              <BodyText style={styles.dateText}>
                Issued on {issuedDate}
              </BodyText>

              {/* QR verification */}
              <View style={styles.qrSection}>
                <QRCode
                  value={certificate.verificationCode}
                  size={80}
                  color={colors.primary}
                />
                <BodyText muted style={styles.verifyCode}>
                  {certificate.verificationCode}
                </BodyText>
                <BodyText muted style={styles.verifyHint}>
                  Scan to verify
                </BodyText>
              </View>
            </View>

            {/* Decorative bottom border */}
            <View style={styles.bottomBorder} />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button onPress={onDownload} loading={downloading}>
              Download & Share PDF
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  certificateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.floating,
  },
  topBorder: {
    height: 6,
    backgroundColor: colors.primary,
  },
  innerFrame: {
    margin: spacing.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary + "40",
    borderRadius: radius.control,
    alignItems: "center",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  orgName: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: colors.primary,
  },
  certType: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  certTitle: {
    textAlign: "center",
    color: colors.primary,
    fontSize: 22,
    marginTop: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
    alignSelf: "stretch",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.secondary + "40",
  },
  presentedTo: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
  },
  memberName: {
    textAlign: "center",
    color: colors.secondary,
    fontSize: 26,
    marginTop: spacing.xs,
    fontWeight: "700",
  },
  reason: {
    textAlign: "center",
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.lg,
    fontStyle: "italic",
  },
  qrSection: {
    marginTop: spacing.lg,
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  verifyCode: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  verifyHint: {
    fontSize: 9,
    marginTop: 2,
  },
  bottomBorder: {
    height: 6,
    backgroundColor: colors.secondary,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
