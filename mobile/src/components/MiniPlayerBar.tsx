import React from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BodyText } from "@/components/ui";
import { usePlayer } from "@/context/PlayerContext";
import { colors, spacing, radius, shadows } from "@/theme";

export function MiniPlayerBar() {
  const { nowPlaying, isPlaying, currentTime, duration, togglePlayPause, stop, openFullPlayer } =
    usePlayer();

  if (!nowPlaying) return null;

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <Pressable onPress={openFullPlayer} style={styles.container}>
      {/* Top micro progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.contentRow}>
        {/* Artwork */}
        {nowPlaying.imageUrl ? (
          <Image source={{ uri: nowPlaying.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons
              name={nowPlaying.mediaType === "video" ? "videocam" : "musical-notes"}
              size={18}
              color={colors.white}
            />
          </View>
        )}

        {/* Title & Subtitle */}
        <View style={styles.textColumn}>
          <BodyText numberOfLines={1} style={styles.title}>
            {nowPlaying.title}
          </BodyText>
          {nowPlaying.subtitle ? (
            <BodyText numberOfLines={1} muted style={styles.subtitle}>
              {nowPlaying.subtitle}
            </BodyText>
          ) : null}
        </View>

        {/* Controls */}
        <View style={styles.actions}>
          <Pressable onPress={togglePlayPause} hitSlop={8} style={styles.playBtn}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color={colors.primary}
            />
          </Pressable>

          <Pressable onPress={stop} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 64, // Sits comfortably above bottom tab bar
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    zIndex: 99,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.secondary,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  thumbPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
    fontSize: 13,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  playBtn: {
    padding: 6,
  },
  closeBtn: {
    padding: 6,
  },
});
