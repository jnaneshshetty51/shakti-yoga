import React, { useState } from "react";
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText } from "@/components/ui";
import { usePlayer } from "@/context/PlayerContext";
import { colors, spacing, radius, shadows } from "@/theme";

const { width } = Dimensions.get("window");

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5];
const SLEEP_OPTIONS = [
  { label: "Off", value: null },
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "60m", value: 60 },
];

export function FullPlayerModal() {
  const {
    nowPlaying,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    sleepTimerMinutes,
    isFullPlayerVisible,
    playerRef,
    togglePlayPause,
    seekTo,
    skipBy,
    setPlaybackRate,
    setSleepTimer,
    closeFullPlayer,
  } = usePlayer();

  const [showSleepPicker, setShowSleepPicker] = useState(false);

  if (!nowPlaying) return null;

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const isVideo = nowPlaying.mediaType === "video";

  const handleScrubPress = (e: any) => {
    const clickX = e.nativeEvent.locationX;
    const barWidth = width - spacing.lg * 2;
    if (barWidth > 0 && duration > 0) {
      const targetPercent = Math.max(0, Math.min(1, clickX / barWidth));
      seekTo(targetPercent * duration);
    }
  };

  return (
    <Modal
      visible={isFullPlayerVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeFullPlayer}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closeFullPlayer} hitSlop={12} style={styles.minimizeBtn}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <BodyText muted style={styles.nowPlayingLabel}>NOW PLAYING</BodyText>
            <BodyText numberOfLines={1} style={styles.headerTitle}>
              {nowPlaying.title}
            </BodyText>
          </View>

          <Pressable
            onPress={() => setShowSleepPicker(!showSleepPicker)}
            hitSlop={8}
            style={[styles.sleepBtn, sleepTimerMinutes ? styles.sleepBtnActive : null]}
          >
            <Ionicons
              name="moon-outline"
              size={20}
              color={sleepTimerMinutes ? colors.secondary : colors.text}
            />
            {sleepTimerMinutes ? (
              <BodyText style={styles.sleepBadgeText}>{sleepTimerMinutes}m</BodyText>
            ) : null}
          </Pressable>
        </View>

        {/* Sleep Picker Dropdown */}
        {showSleepPicker && (
          <View style={styles.sleepDropdown}>
            <BodyText style={styles.dropdownTitle}>Sleep Timer</BodyText>
            <View style={styles.optionsRow}>
              {SLEEP_OPTIONS.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    setSleepTimer(opt.value);
                    setShowSleepPicker(false);
                  }}
                  style={[
                    styles.sleepOptionPill,
                    sleepTimerMinutes === opt.value && styles.sleepOptionPillActive,
                  ]}
                >
                  <BodyText
                    style={[
                      styles.sleepOptionText,
                      sleepTimerMinutes === opt.value && styles.sleepOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </BodyText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Media Visual Area */}
        <View style={styles.visualContainer}>
          {isVideo && playerRef.current ? (
            <VideoView
              player={playerRef.current}
              style={styles.videoPlayer}
              nativeControls
              contentFit="contain"
            />
          ) : (
            <View style={styles.artworkWrapper}>
              {nowPlaying.imageUrl ? (
                <Image source={{ uri: nowPlaying.imageUrl }} style={styles.artwork} />
              ) : (
                <View style={[styles.artwork, styles.artworkPlaceholder]}>
                  <Ionicons name="flower-outline" size={72} color={colors.secondary} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Track Details */}
        <View style={styles.trackDetails}>
          <Heading size="md" style={{ textAlign: "center" }}>
            {nowPlaying.title}
          </Heading>
          {nowPlaying.subtitle ? (
            <BodyText muted style={styles.trackSubtitle}>
              {nowPlaying.subtitle}
            </BodyText>
          ) : null}
        </View>

        {/* Scrubber */}
        <View style={styles.scrubberContainer}>
          <Pressable onPress={handleScrubPress} style={styles.scrubberTouchArea}>
            <View style={styles.scrubberTrack}>
              <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.scrubberThumb, { left: `${progress * 100}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <BodyText muted style={styles.timeText}>
              {formatTime(currentTime)}
            </BodyText>
            <BodyText muted style={styles.timeText}>
              {duration > 0 ? `-${formatTime(duration - currentTime)}` : "--:--"}
            </BodyText>
          </View>
        </View>

        {/* Primary Controls */}
        <View style={styles.primaryControls}>
          <Pressable onPress={() => skipBy(-15)} hitSlop={12} style={styles.skipBtn}>
            <Ionicons name="play-back" size={26} color={colors.primary} />
            <BodyText style={styles.skipSecLabel}>15</BodyText>
          </Pressable>

          <Pressable onPress={togglePlayPause} style={styles.mainPlayBtn}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={36}
              color={colors.white}
              style={{ marginLeft: isPlaying ? 0 : 3 }}
            />
          </Pressable>

          <Pressable onPress={() => skipBy(15)} hitSlop={12} style={styles.skipBtn}>
            <Ionicons name="play-forward" size={26} color={colors.primary} />
            <BodyText style={styles.skipSecLabel}>15</BodyText>
          </Pressable>
        </View>

        {/* Playback Speed Selector */}
        <View style={styles.speedRow}>
          <BodyText muted style={{ fontSize: 12 }}>Speed:</BodyText>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setPlaybackRate(s)}
              style={[styles.speedPill, playbackRate === s && styles.speedPillActive]}
            >
              <BodyText
                style={[styles.speedText, playbackRate === s && styles.speedTextActive]}
              >
                {s}x
              </BodyText>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? spacing.md : spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  minimizeBtn: {
    padding: spacing.xs,
  },
  headerTitleWrap: {
    alignItems: "center",
    maxWidth: "65%",
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  sleepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  sleepBtnActive: {
    backgroundColor: colors.secondaryLight,
  },
  sleepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
  },
  sleepDropdown: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  sleepOptionPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  sleepOptionPillActive: {
    backgroundColor: colors.secondary,
  },
  sleepOptionText: {
    fontSize: 12,
  },
  sleepOptionTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  visualContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },
  videoPlayer: {
    width: width - spacing.lg * 2,
    height: (width - spacing.lg * 2) * (9 / 16),
    borderRadius: radius.card,
    backgroundColor: "#000",
  },
  artworkWrapper: {
    ...shadows.card,
  },
  artwork: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    borderWidth: 4,
    borderColor: colors.secondaryLight,
  },
  artworkPlaceholder: {
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  trackDetails: {
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  trackSubtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  scrubberContainer: {
    marginVertical: spacing.sm,
  },
  scrubberTouchArea: {
    paddingVertical: 10,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    position: "relative",
  },
  scrubberFill: {
    height: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },
  scrubberThumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.secondary,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
  },
  primaryControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginVertical: spacing.sm,
  },
  skipBtn: {
    alignItems: "center",
    padding: spacing.xs,
  },
  skipSecLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    marginTop: -2,
  },
  mainPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  speedPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  speedPillActive: {
    backgroundColor: colors.primary,
  },
  speedText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  speedTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
});
