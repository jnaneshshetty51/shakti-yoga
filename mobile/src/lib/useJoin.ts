import { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, ApiError } from "@/lib/api";

/** Shared "tap Join -> check in -> open Google Meet" flow for group classes and 1:1 bookings. */
export function useJoin() {
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      const body = err.data as { outOfSessions?: boolean } | null;
      if (body?.outOfSessions) {
        Alert.alert("You're out of sessions this cycle", err.message, [
          { text: "Not now", style: "cancel" },
          { text: "Contact Support", onPress: () => router.push("/support") },
        ]);
        return;
      }
      Alert.alert("Can't join yet", err.message);
      return;
    }
    Alert.alert("Can't join yet", "Something went wrong.");
  };

  const joinClass = async (instanceId: string) => {
    setJoiningId(instanceId);
    try {
      const { meetingLink } = await api.post<{ meetingLink: string }>(`/api/classes/${instanceId}/join`);
      await WebBrowser.openBrowserAsync(meetingLink);
    } catch (err) {
      handleError(err);
    } finally {
      setJoiningId(null);
    }
  };

  const joinBooking = async (bookingId: string) => {
    setJoiningId(bookingId);
    try {
      const { meetingLink } = await api.get<{ meetingLink: string }>(`/api/bookings/${bookingId}`);
      await WebBrowser.openBrowserAsync(meetingLink);
    } catch (err) {
      handleError(err);
    } finally {
      setJoiningId(null);
    }
  };

  return { joiningId, joinClass, joinBooking };
}
