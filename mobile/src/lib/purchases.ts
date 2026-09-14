import Purchases, { LOG_LEVEL, type PurchasesPackage, type CustomerInfo } from "react-native-purchases";
import { Platform } from "react-native";

/**
 * RevenueCat client wiring. The backend webhook already exists at
 * /api/webhooks/revenuecat and reconciles by app_user_id — this file's job is
 * only to configure the SDK, keep app_user_id in sync with our own login
 * state (Purchases.logIn/logOut), and drive a purchase.
 *
 * Requires real keys before this does anything: set
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (from
 * RevenueCat > Project settings > API keys) in `.env`. Until then,
 * initPurchases() logs a warning and every other function here is a no-op —
 * the rest of the app keeps working, there's just nothing to purchase.
 *
 * Also requires: real products created in App Store Connect / Google Play
 * Console with these exact identifiers (already defined server-side in
 * src/lib/pricing.ts's `rcProductId`, and configured into RevenueCat
 * Offerings on the RevenueCat dashboard — this file doesn't hardcode them,
 * it just displays whatever the dashboard's "current" offering returns):
 *   sy_starter_monthly, sy_everyday_monthly, sy_everyday_annual,
 *   sy_therapy_monthly, sy_therapy_annual, sy_family_monthly, sy_family_annual
 *
 * IMPORTANT: react-native-purchases is a native module — it will NOT run in
 * plain Expo Go. Building/running the app after this change needs a custom
 * dev client (`npx expo run:ios` / `run:android`, or an EAS dev build).
 */

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

let configured = false;

export function initPurchases(): void {
  if (configured) return;
  const apiKey = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      "[purchases] No RevenueCat API key configured — in-app purchases are disabled. " +
        "Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY. See mobile/README.md.",
    );
    return;
  }
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  configured = true;
}

/** Whether a real API key was found — screens use this to decide whether to show a paywall or a "not configured yet" state. */
export function purchasesReady(): boolean {
  return configured;
}

/** Call right after our own login/register succeeds, so RevenueCat's app_user_id matches the backend's user id (what the webhook keys off). */
export async function loginPurchases(userId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn("[purchases] logIn failed", e);
  }
}

/** Call on our own logout — resets to an anonymous RevenueCat user. */
export async function logoutPurchases(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[purchases] logOut failed", e);
  }
}

/** Packages in the dashboard's current Offering — empty if not configured or nothing's set up yet. */
export async function getCurrentOfferingPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.warn("[purchases] getOfferings failed", e);
    return [];
  }
}

export type PurchaseOutcome = { ok: true } | { ok: false; cancelled: boolean; message: string };

export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    return { ok: false, cancelled: !!err.userCancelled, message: err.message ?? "Purchase failed. Please try again." };
  }
}

/** Restores prior purchases (reinstalls, new device). Returns null if not configured or nothing to restore. */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.warn("[purchases] restorePurchases failed", e);
    return null;
  }
}
