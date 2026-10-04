import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { createVideoPlayer, VideoPlayer } from "expo-video";

export interface PlayableItem {
  id: string;
  title: string;
  subtitle?: string;
  uri: string;
  mediaType: "video" | "audio";
  imageUrl?: string | null;
  durationSec?: number;
}

interface PlayerContextType {
  nowPlaying: PlayableItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  sleepTimerMinutes: number | null;
  isFullPlayerVisible: boolean;
  playerRef: React.MutableRefObject<VideoPlayer | null>;
  play: (item: PlayableItem) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  skipBy: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  stop: () => void;
  pauseAll: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setRateState] = useState(1.0);
  const [sleepTimerMinutes, setSleepTimer] = useState<number | null>(null);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);

  const playerRef = useRef<VideoPlayer | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll player status & update time/duration
  useEffect(() => {
    if (!nowPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      const p = playerRef.current;
      if (p) {
        setIsPlaying(p.playing);
        setCurrentTime(p.currentTime || 0);
        if (p.duration && p.duration > 0) {
          setDuration(p.duration);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [nowPlaying]);

  // Handle sleep timer
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    // A real-time "fall asleep" countdown — it must keep running while paused, not reset to
    // the full duration on every pause/resume (isPlaying is deliberately not a dependency).
    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.pause();
          setIsPlaying(false);
        }
        setSleepTimer(null);
      }, sleepTimerMinutes * 60 * 1000);
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepTimerMinutes]);

  const play = useCallback((item: PlayableItem) => {
    try {
      // createVideoPlayer() "doesn't release automatically" (expo-video's own doc comment) —
      // pausing the outgoing player isn't enough, it leaks its native decoder otherwise.
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
      }

      const player = createVideoPlayer(item.uri);
      player.playbackRate = playbackRate;
      player.play();

      playerRef.current = player;
      setNowPlaying(item);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(item.durationSec || 0);
    } catch (err) {
      console.warn("Failed to play media:", err);
    }
  }, [playbackRate]);

  const togglePlayPause = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.playing) {
      p.pause();
      setIsPlaying(false);
    } else {
      p.play();
      setIsPlaying(true);
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = Math.max(0, Math.min(seconds, duration || 999999));
    setCurrentTime(p.currentTime);
  }, [duration]);

  const skipBy = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(p.currentTime + seconds, duration || 999999));
    p.currentTime = next;
    setCurrentTime(next);
  }, [duration]);

  const setPlaybackRate = useCallback((rate: number) => {
    const p = playerRef.current;
    setRateState(rate);
    if (p) {
      p.playbackRate = rate;
    }
  }, []);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.release();
      playerRef.current = null;
    }
    setNowPlaying(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsFullPlayerVisible(false);
    setSleepTimer(null);
  }, []);

  /** Pauses whatever's actually playing, read from the live native player (not the
   * possibly-stale polled `isPlaying` state) — used by the app-lock gate. */
  const pauseAll = useCallback(() => {
    const p = playerRef.current;
    if (p && p.playing) {
      p.pause();
      setIsPlaying(false);
    }
  }, []);

  const openFullPlayer = useCallback(() => setIsFullPlayerVisible(true), []);
  const closeFullPlayer = useCallback(() => setIsFullPlayerVisible(false), []);

  return (
    <PlayerContext.Provider
      value={{
        nowPlaying,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        sleepTimerMinutes,
        isFullPlayerVisible,
        playerRef,
        play,
        togglePlayPause,
        seekTo,
        skipBy,
        setPlaybackRate,
        setSleepTimer,
        openFullPlayer,
        closeFullPlayer,
        stop,
        pauseAll,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return ctx;
}
