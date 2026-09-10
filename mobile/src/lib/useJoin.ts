import { useState } from "react";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api, ApiError } from "@/lib/api";

/** Shared "tap Join -> check in -> open Google Meet" flow for group classes and 1:1 bookings. */
export function useJoin() {
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const joinClass = async (instanceId: string) => {
    setJoiningId(instanceId);
    try {
      const { meetingLink } = await api.post<{ meetingLink: string }>(`/api/classes/${instanceId}/join`);
      await WebBrowser.openBrowserAsync(meetingLink);
    } catch (err) {
      Alert.alert("Can't join yet", err instanceof ApiError ? err.message : "Something went wrong.");
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
      Alert.alert("Can't join yet", err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setJoiningId(null);
    }
  };

  return { joiningId, joinClass, joinBooking };
}
