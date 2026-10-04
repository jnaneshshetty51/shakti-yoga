import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
  Vibration,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText, Button } from "@/components/ui";
import { colors, spacing, radius, shadows } from "@/theme";

type TimerMode = "hold" | "breath" | "stopwatch";

interface PracticeTimerModalProps {
  visible: boolean;
  practiceTitle?: string;
  onClose: () => void;
  onCompletePractice?: () => void;
}

const HOLD_PRESETS = [30, 45, 60, 90, 120, 180];
const BREATH_PHASES = [
  { name: "Inhale", duration: 4, scale: 1.35, color: colors.secondary },
  { name: "Hold", duration: 4, scale: 1.35, color: colors.primary },
  { name: "Exhale", duration: 4, scale: 0.85, color: colors.sageText },
  { name: "Hold", duration: 4, scale: 0.85, color: colors.primary },
];

export function PracticeTimerModal({
  visible,
  practiceTitle,
  onClose,
  onCompletePractice,
}: PracticeTimerModalProps) {
  const [mode, setMode] = useState<TimerMode>("hold");

  // Hold Timer state
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [holdRemaining, setHoldRemaining] = useState(60);
  const [isHoldRunning, setIsHoldRunning] = useState(false);

  // Breath Pacer state
  const [breathPhaseIndex, setBreathPhaseIndex] = useState(0);
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(4);
  const [breathCycle, setBreathCycle] = useState(1);
  const [isBreathRunning, setIsBreathRunning] = useState(false);
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Stopwatch state
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // RN's Modal only hides its content when `visible` goes false — it doesn't unmount, so the
  // running-mode intervals (and their vibration) would otherwise keep firing in the background.
  useEffect(() => {
    if (!visible) {
      setIsHoldRunning(false);
      setIsBreathRunning(false);
      setIsStopwatchRunning(false);
    }
  }, [visible]);

  // Hold Timer countdown
  useEffect(() => {
    if (isHoldRunning) {
      holdIntervalRef.current = setInterval(() => {
        setHoldRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(holdIntervalRef.current!);
            setIsHoldRunning(false);
            if (Platform.OS !== "web") Vibration.vibrate([0, 250, 150, 250]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHoldRunning]);

  // Breath Pacer
  useEffect(() => {
    if (isBreathRunning) {
      const currentPhase = BREATH_PHASES[breathPhaseIndex];
      Animated.timing(breathAnim, {
        toValue: currentPhase.scale,
        duration: currentPhase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();

      breathIntervalRef.current = setInterval(() => {
        setBreathSecondsLeft((prev) => {
          if (prev <= 1) {
            setBreathPhaseIndex((prevPhase) => {
              const nextPhase = (prevPhase + 1) % BREATH_PHASES.length;
              if (nextPhase === 0) setBreathCycle((c) => c + 1);
              return nextPhase;
            });
            if (Platform.OS !== "web") Vibration.vibrate(60);
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (breathIntervalRef.current) {
      clearInterval(breathIntervalRef.current);
    }
    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [isBreathRunning, breathPhaseIndex, breathAnim]);

  // Stopwatch
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    } else if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [isStopwatchRunning]);

  const resetAll = () => {
    setIsHoldRunning(false);
    setHoldRemaining(targetSeconds);
    setIsBreathRunning(false);
    setBreathPhaseIndex(0);
    setBreathSecondsLeft(4);
    setBreathCycle(1);
    breathAnim.setValue(1);
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
  };

  const handleSelectPreset = (sec: number) => {
    setTargetSeconds(sec);
    setHoldRemaining(sec);
    setIsHoldRunning(false);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const ringRadius = 88;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * ringRadius;
  const holdProgress = targetSeconds > 0 ? (targetSeconds - holdRemaining) / targetSeconds : 0;
  const strokeDashoffset = circumference - holdProgress * circumference;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.titleWrap}>
            <BodyText muted style={styles.timerSub}>PRACTICE COMPANION</BodyText>
            <Heading size="sm">
              {practiceTitle || "Yoga Timer"}
            </Heading>
          </View>

          <Pressable onPress={resetAll} hitSlop={8} style={styles.resetBtn}>
            <Ionicons name="refresh" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Mode Selector Tabs */}
        <View style={styles.modeTabsRow}>
          <Pressable
            onPress={() => {
              resetAll();
              setMode("hold");
            }}
            style={[styles.modeTab, mode === "hold" && styles.modeTabActive]}
          >
            <Ionicons
              name="hourglass-outline"
              size={16}
              color={mode === "hold" ? colors.white : colors.textMuted}
            />
            <BodyText style={[styles.modeTabText, mode === "hold" && styles.modeTabTextActive]}>
              Asana Hold
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => {
              resetAll();
              setMode("breath");
            }}
            style={[styles.modeTab, mode === "breath" && styles.modeTabActive]}
          >
            <Ionicons
              name="radio-button-on-outline"
              size={16}
              color={mode === "breath" ? colors.white : colors.textMuted}
            />
            <BodyText style={[styles.modeTabText, mode === "breath" && styles.modeTabTextActive]}>
              Breath Pacer
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => {
              resetAll();
              setMode("stopwatch");
            }}
            style={[styles.modeTab, mode === "stopwatch" && styles.modeTabActive]}
          >
            <Ionicons
              name="stopwatch-outline"
              size={16}
              color={mode === "stopwatch" ? colors.white : colors.textMuted}
            />
            <BodyText style={[styles.modeTabText, mode === "stopwatch" && styles.modeTabTextActive]}>
              Stopwatch
            </BodyText>
          </Pressable>
        </View>

        {/* Center Display Area */}
        <View style={styles.displayArea}>
          {mode === "hold" && (
            <View style={styles.holdContainer}>
              <View style={styles.ringWrapper}>
                <Svg width={210} height={210}>
                  <Circle
                    cx={105}
                    cy={105}
                    r={ringRadius}
                    stroke={colors.border}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <Circle
                    cx={105}
                    cy={105}
                    r={ringRadius}
                    stroke={colors.secondary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    transform="rotate(-90 105 105)"
                  />
                </Svg>
                <View style={styles.ringCenterText}>
                  <Text style={styles.largeTimeText}>{formatTimer(holdRemaining)}</Text>
                  <BodyText muted style={{ fontSize: 13 }}>
                    {isHoldRunning ? "Holding posture" : holdRemaining === 0 ? "Complete! 🎉" : "Ready"}
                  </BodyText>
                </View>
              </View>

              {/* Presets */}
              <View style={styles.presetsRow}>
                {HOLD_PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => handleSelectPreset(p)}
                    style={[styles.presetPill, targetSeconds === p && styles.presetPillActive]}
                  >
                    <BodyText style={[styles.presetText, targetSeconds === p && styles.presetTextActive]}>
                      {p >= 60 ? `${p / 60}m` : `${p}s`}
                    </BodyText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {mode === "breath" && (
            <View style={styles.breathContainer}>
              <Animated.View
                style={[
                  styles.mandalaCircle,
                  {
                    transform: [{ scale: breathAnim }],
                    borderColor: BREATH_PHASES[breathPhaseIndex].color,
                  },
                ]}
              >
                <Text style={[styles.breathPhaseText, { color: BREATH_PHASES[breathPhaseIndex].color }]}>
                  {BREATH_PHASES[breathPhaseIndex].name}
                </Text>
                <Text style={styles.breathSecondsText}>{breathSecondsLeft}</Text>
              </Animated.View>
              <BodyText muted style={styles.cycleText}>
                Box Breathing (4-4-4-4) · Cycle {breathCycle}
              </BodyText>
            </View>
          )}

          {mode === "stopwatch" && (
            <View style={styles.stopwatchContainer}>
              <View style={styles.stopwatchCard}>
                <Ionicons name="time-outline" size={48} color={colors.primary} />
                <Text style={styles.largeTimeText}>{formatTimer(stopwatchSeconds)}</Text>
                <BodyText muted style={{ fontSize: 13, marginTop: 4 }}>
                  {isStopwatchRunning ? "Free practice in progress" : "Timer paused"}
                </BodyText>
              </View>
            </View>
          )}
        </View>

        {/* Primary Action Button */}
        <View style={styles.footerControls}>
          <Pressable
            onPress={() => {
              if (mode === "hold") {
                if (holdRemaining === 0) setHoldRemaining(targetSeconds);
                setIsHoldRunning(!isHoldRunning);
              } else if (mode === "breath") {
                setIsBreathRunning(!isBreathRunning);
              } else {
                setIsStopwatchRunning(!isStopwatchRunning);
              }
            }}
            style={styles.mainToggleBtn}
          >
            <Ionicons
              name={
                (mode === "hold" && isHoldRunning) ||
                (mode === "breath" && isBreathRunning) ||
                (mode === "stopwatch" && isStopwatchRunning)
                  ? "pause"
                  : "play"
              }
              size={32}
              color={colors.white}
              style={{
                marginLeft:
                  (mode === "hold" && isHoldRunning) ||
                  (mode === "breath" && isBreathRunning) ||
                  (mode === "stopwatch" && isStopwatchRunning)
                    ? 0
                    : 3,
              }}
            />
          </Pressable>

          {onCompletePractice && (
            <Button
              variant="outline"
              onPress={() => {
                resetAll();
                onClose();
                onCompletePractice();
              }}
              style={{ marginTop: spacing.md }}
            >
              Finish & Log Completed Practice
            </Button>
          )}
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
  closeBtn: {
    padding: spacing.xs,
  },
  titleWrap: {
    alignItems: "center",
    maxWidth: "70%",
  },
  timerSub: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  resetBtn: {
    padding: spacing.xs,
  },
  modeTabsRow: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.md,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  displayArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  holdContainer: {
    alignItems: "center",
    width: "100%",
  },
  ringWrapper: {
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
  },
  largeTimeText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.text,
  },
  presetsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  presetPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetPillActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  presetTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  breathContainer: {
    alignItems: "center",
  },
  mandalaCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 5,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  breathPhaseText: {
    fontSize: 22,
    fontWeight: "700",
  },
  breathSecondsText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  cycleText: {
    marginTop: spacing.xl,
    fontSize: 13,
  },
  stopwatchContainer: {
    alignItems: "center",
    width: "100%",
  },
  stopwatchCard: {
    width: "80%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  footerControls: {
    alignItems: "center",
  },
  mainToggleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
});
