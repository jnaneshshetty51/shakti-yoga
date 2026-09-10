import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const KEY = "biometric_app_lock";

export async function isAppLockOn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAppLock(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function biometricAvailable(): Promise<boolean> {
  const has = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return has && enrolled;
}

/** Prompt for biometrics/PIN. Returns true if authenticated (or if lock isn't on). */
export async function authenticateIfLocked(): Promise<boolean> {
  if (!(await isAppLockOn())) return true;
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Shakti Yoga",
    fallbackLabel: "Use passcode",
  });
  return res.success;
}
