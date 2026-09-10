import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";

/**
 * Register this device's Expo push token with the backend so class reminders,
 * support replies, certificate approvals etc. reach it. Safe to call on every
 * login / cold start — the backend upserts by token.
 *
 * No-ops silently on a simulator, without notification permission, or before the
 * app is registered with EAS (no `extra.eas.projectId` → `getExpoPushTokenAsync`
 * throws). None of those should break the sign-in flow.
 */
export async function registerForPush(): Promise<void> {
    try {
        if (!Device.isDevice) return;

        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== "granted") {
            status = (await Notifications.requestPermissionsAsync()).status;
        }
        if (status !== "granted") return;

        if (Platform.OS === "android") {
            const H = Notifications.AndroidImportance.HIGH;
            const D = Notifications.AndroidImportance.DEFAULT;
            await Promise.all([
                Notifications.setNotificationChannelAsync("default", { name: "General", importance: D }),
                Notifications.setNotificationChannelAsync("classes", { name: "Class reminders", importance: H }),
                Notifications.setNotificationChannelAsync("sessions", { name: "1:1 sessions", importance: H }),
                Notifications.setNotificationChannelAsync("billing", { name: "Billing & membership", importance: D }),
            ]);
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return; // not registered with EAS yet

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await api.post("/api/push/register", {
            token,
            platform: Platform.OS === "ios" ? "ios" : "android",
            deviceName: Device.deviceName ?? undefined,
        });
    } catch {
        /* push is best-effort — never block auth on it */
    }
}

/** Drop this device's token on sign-out. Call BEFORE clearing the auth token. */
export async function unregisterForPush(): Promise<void> {
    try {
        if (!Device.isDevice) return;
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await api.post("/api/push/unregister", { token });
    } catch {
        /* ignore */
    }
}
