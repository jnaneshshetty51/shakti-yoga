import React, { useState } from "react";
import {
  Modal,
  View,
  TextInput,
  Image,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Button } from "@/components/ui";
import { api, ApiError, appendImageFile } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";

interface PostComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: (post: any) => void;
}

const MAX_CHARS = 2000;

export function PostComposerModal({ visible, onClose, onPostCreated }: PostComposerModalProps) {
  const [body, setBody] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant access to your photo library to attach photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setSelectedImageMime(result.assets[0].mimeType);
      }
    } catch {
      Alert.alert("Error", "Could not open photos.");
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageUri(null);
  };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed && !selectedImageUri) {
      Alert.alert("Empty post", "Write a message or attach a photo before posting.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (selectedImageUri) {
        const formData = new FormData();
        await appendImageFile(formData, "file", selectedImageUri, selectedImageMime, "community_post.jpg");

        const uploadRes = await api.upload<{ url: string }>("/api/community/upload", formData);
        imageUrl = uploadRes.url;
      }

      const res = await api.post<{ post: any }>("/api/community/posts", {
        body: trimmed || " ",
        imageUrl,
      });

      setBody("");
      setSelectedImageUri(null);
      onPostCreated(res.post);
      onClose();
    } catch (err) {
      Alert.alert("Could not post", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = MAX_CHARS - body.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Heading size="sm">Share with Community</Heading>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
            {/* Input */}
            <TextInput
              style={styles.textInput}
              placeholder="Reflect on today's practice, ask questions, or share an inspiring moment..."
              placeholderTextColor={colors.muted}
              multiline
              value={body}
              onChangeText={setBody}
              maxLength={MAX_CHARS}
              autoFocus
            />

            {/* Attached Image Preview */}
            {selectedImageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                <Pressable onPress={handleRemoveImage} style={styles.removeImageBtn} hitSlop={6}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Action Bar */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Pressable onPress={handlePickImage} style={styles.attachBtn} hitSlop={6}>
                <Ionicons name="image-outline" size={22} color={colors.primary} />
                <BodyText style={styles.attachBtnText}>
                  {selectedImageUri ? "Change photo" : "Add photo"}
                </BodyText>
              </Pressable>
              <BodyText muted style={styles.charCount}>{remaining}</BodyText>
            </View>

            <Button
              variant="primary"
              loading={submitting}
              onPress={handleSubmit}
              disabled={submitting || (!body.trim() && !selectedImageUri)}
            >
              Post
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.md,
    maxHeight: "85%",
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollArea: {
    maxHeight: 280,
    marginTop: spacing.sm,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: "top",
    paddingVertical: spacing.xs,
  },
  imagePreviewContainer: {
    position: "relative",
    marginVertical: spacing.sm,
    borderRadius: radius.control,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: radius.control,
  },
  removeImageBtn: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
  },
  attachBtnText: {
    fontSize: 13,
    color: colors.sageText,
    fontWeight: "600",
  },
  charCount: {
    fontSize: 12,
  },
});
