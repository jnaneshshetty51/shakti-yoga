import React, { useState, useEffect } from "react";
import { ScrollView, View, Image, Alert, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, BodyText, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PracticeTimerModal } from "@/components/PracticeTimerModal";
import { AchievementModal } from "@/components/AchievementModal";
import { usePlayer } from "@/context/PlayerContext";
import {
  isItemDownloaded,
  downloadItem,
  deleteOfflineItem,
  getOfflineItem,
} from "@/lib/offlineStorage";
import { api } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { mediaUri } from "@/lib/media";
import { LEVEL_LABEL, categoryLabel } from "@/lib/practice";
import { toParagraphs, toSteps } from "@/lib/text";
import { colors, spacing, radius, shadows } from "@/theme";
import type { PracticeView } from "@/lib/types";

export default function PracticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useResource(
    () => api.get<{ practice: PracticeView }>(`/api/practices/${id}`),
    [id],
  );
  const p = data?.practice;

  const { play, openFullPlayer, togglePlayPause, nowPlaying, isPlaying } = usePlayer();

  const [done, setDone] = useState(false);
  const [marking, setMarking] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<{ title?: string; name?: string; description?: string }[]>([]);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  // Offline Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (id) {
      isItemDownloaded(id).then(setIsDownloaded);
    }
  }, [id]);

  const markDone = async () => {
    if (!id) return;
    setMarking(true);
    try {
      const res = await api.post<{ ok: boolean; earned: { title?: string; name?: string; description?: string }[] }>(
        `/api/practices/${id}/complete`,
      );
      setDone(true);
      if (res.earned && res.earned.length > 0) {
        setEarnedBadges(res.earned);
        setBadgeModalVisible(true);
      } else {
        Alert.alert("Practice Completed", "Great job! Your practice session has been logged.");
      }
    } catch {
      Alert.alert("Couldn't save", "Please try again in a moment.");
    } finally {
      setMarking(false);
    }
  };

  const thumb = mediaUri(p?.thumbnailUrl);
  const steps = toSteps(p?.steps);
  const paragraphs = toParagraphs(p?.description);
  const completed = done || Boolean(p?.completed);

  // In-app play
  const handlePlayMedia = async () => {
    if (!p || !p.videoUrl) return;
    const offlineCopy = await getOfflineItem(p.id);
    const playbackUri = offlineCopy ? offlineCopy.localUri : mediaUri(p.videoUrl);
    if (!playbackUri) return;

    // If external link (e.g. YouTube), open browser
    if (playbackUri.includes("youtube.com") || playbackUri.includes("youtu.be") || playbackUri.includes("vimeo.com")) {
      WebBrowser.openBrowserAsync(playbackUri);
      return;
    }

    play({
      id: p.id,
      title: p.title,
      subtitle: `${p.durationMin} min · ${categoryLabel(p.category)}`,
      uri: playbackUri,
      mediaType: "video",
      imageUrl: thumb,
      durationSec: (p.durationMin || 10) * 60,
    });
    openFullPlayer();
  };

  // Play button/overlay: toggle if this track is already loaded, otherwise (re)start it.
  const isCurrentlyLoaded = nowPlaying?.id === p?.id;
  const handlePlayPress = () => {
    if (isCurrentlyLoaded) {
      togglePlayPause();
    } else {
      handlePlayMedia();
    }
  };

  // Handle Download toggle
  const handleToggleDownload = async () => {
    if (!p || !p.videoUrl) return;
    if (isDownloaded) {
      Alert.alert("Remove Download", "Remove this practice from offline storage?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteOfflineItem(p.id);
            setIsDownloaded(false);
          },
        },
      ]);
      return;
    }

    const fullMediaUrl = mediaUri(p.videoUrl);
    if (!fullMediaUrl) {
      Alert.alert("Error", "Media URL not available for download.");
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadItem(
        {
          id: p.id,
          title: p.title,
          category: categoryLabel(p.category),
          durationMin: p.durationMin,
          kind: "video",
          mediaUrl: fullMediaUrl,
          thumbnailUrl: thumb,
        },
        (progress) => setDownloadProgress(progress),
      );
      setIsDownloaded(true);
      Alert.alert("Downloaded", "This practice is now saved for offline yoga anywhere!");
    } catch {
      Alert.alert("Download Failed", "Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  const isCurrentPlaying = isCurrentlyLoaded && isPlaying;

  return (
    <Screen>
      <ScreenHeader
        title="Practice"
        rightAction={
          p?.videoUrl && Platform.OS !== "web" ? (
            <Pressable
              onPress={handleToggleDownload}
              hitSlop={8}
              disabled={downloading}
              style={styles.headerDownloadBtn}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <Ionicons
                  name={isDownloaded ? "checkmark-circle" : "arrow-down-circle-outline"}
                  size={24}
                  color={isDownloaded ? colors.primary : colors.secondary}
                />
              )}
            </Pressable>
          ) : null
        }
      />

      {loading ? (
        <LoadingView />
      ) : error || !p ? (
        <EmptyState title="Not found" subtitle={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Thumbnail with In-App Play Overlay */}
          <View style={styles.heroWrapper}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.hero} />
            ) : (
              <View style={[styles.hero, styles.heroPlaceholder]}>
                <Ionicons name="flower-outline" size={64} color={colors.secondary} />
              </View>
            )}

            {p.videoUrl ? (
              <Pressable onPress={handlePlayPress} style={styles.playOverlayBtn} hitSlop={12}>
                <Ionicons
                  name={isCurrentPlaying ? "pause" : "play"}
                  size={32}
                  color={colors.white}
                  style={{ marginLeft: isCurrentPlaying ? 0 : 3 }}
                />
              </Pressable>
            ) : null}

            {isDownloaded && (
              <View style={styles.offlineBadgeOverlay}>
                <Ionicons name="cloud-done" size={14} color={colors.white} />
                <BodyText style={styles.offlineBadgeText}>Offline Ready</BodyText>
              </View>
            )}
          </View>

          {/* Title & Metadata */}
          <Heading size="lg" style={{ marginTop: spacing.md }}>{p.title}</Heading>
          <View style={styles.metaRow}>
            <Badge tone="success">{LEVEL_LABEL[p.level]}</Badge>
            <BodyText muted style={{ fontSize: 13 }}>
              {p.durationMin} min · {categoryLabel(p.category)}
            </BodyText>
          </View>

          {/* Quick Action Buttons Row */}
          <View style={styles.quickActionsRow}>
            {p.videoUrl ? (
              <Button
                variant="primary"
                onPress={handlePlayPress}
                style={styles.playActionBtn}
              >
                {isCurrentPlaying ? "Playing Now" : "Play Video"}
              </Button>
            ) : null}

            <Button
              variant="secondary"
              onPress={() => setTimerVisible(true)}
              style={styles.timerActionBtn}
            >
              Practice Timer
            </Button>
          </View>

          {/* Description */}
          {paragraphs.map((para, i) => (
            <BodyText key={i} style={styles.descriptionPara}>{para}</BodyText>
          ))}

          {/* Step-by-Step Instructions */}
          {steps.length > 0 && (
            <View style={styles.stepsContainer}>
              <Heading size="sm" style={{ marginBottom: spacing.sm }}>How to practise</Heading>
              {steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <BodyText style={styles.stepNum}>{i + 1}</BodyText>
                  <BodyText style={{ flex: 1, fontSize: 14, lineHeight: 21 }}>{s}</BodyText>
                </View>
              ))}
            </View>
          )}

          {/* Completion */}
          {completed ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              <BodyText style={{ fontWeight: "700", color: colors.primary, fontSize: 15 }}>
                Practised Today
              </BodyText>
            </View>
          ) : (
            <Button
              variant="outline"
              style={{ marginTop: spacing.lg }}
              loading={marking}
              onPress={markDone}
            >
              Mark as done
            </Button>
          )}
        </ScrollView>
      )}

      {/* Interactive Practice Timer Modal */}
      <PracticeTimerModal
        visible={timerVisible}
        practiceTitle={p?.title}
        onClose={() => setTimerVisible(false)}
        onCompletePractice={markDone}
      />

      {/* Achievement Unlocked Celebratory Modal */}
      <AchievementModal
        visible={badgeModalVisible}
        achievements={earnedBadges}
        onClose={() => setBadgeModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerDownloadBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  heroWrapper: {
    position: "relative",
    width: "100%",
    height: 210,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.card,
  },
  hero: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -28,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(45, 71, 57, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  offlineBadgeOverlay: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(45, 71, 57, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  offlineBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  playActionBtn: {
    flex: 1,
  },
  timerActionBtn: {
    flex: 1,
  },
  descriptionPara: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  stepsContainer: {
    marginTop: spacing.lg,
  },
  step: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    overflow: "hidden",
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.sage,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
  },
});
