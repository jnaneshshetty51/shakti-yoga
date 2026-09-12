import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { PurchasesPackage } from "react-native-purchases";
import { Screen, Heading, BodyText, Card, Button, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api } from "@/lib/api";
import { getCurrentOfferingPackages, purchase, purchasesReady, restorePurchases } from "@/lib/purchases";
import { spacing } from "@/theme";

interface BillingResponse {
  subscription: { status: string } | null;
}

/**
 * Paywall — lists whatever packages are configured in the RevenueCat
 * dashboard's current Offering and lets the member buy one. Previously there
 * was no purchase flow on mobile at all: "See plans" / "Renew" just sent
 * people to the web checkout in a browser, which is a store-policy problem
 * for a subscription app and bypasses the RevenueCat reconciliation the
 * backend webhook (/api/webhooks/revenuecat) exists for.
 *
 * Requires real RevenueCat API keys and store products before this can
 * actually sell anything — see src/lib/purchases.ts. Until then this screen
 * explains that plainly instead of pretending to work.
 */
export default function SubscribeScreen() {
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);

  useEffect(() => {
    getCurrentOfferingPackages().then(setPackages);
  }, []);

  // The webhook that actually activates the plan is async — give it a few
  // seconds to land instead of sending the member to a membership screen
  // that still says "no active plan" right after they just paid.
  const waitForActivation = useCallback(async () => {
    setWaitingForWebhook(true);
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const billing = await api.get<BillingResponse>("/api/billing");
        if (billing.subscription && billing.subscription.status !== "EXPIRED") break;
      } catch {
        // keep waiting — the purchase itself already succeeded
      }
    }
    setWaitingForWebhook(false);
    router.replace("/membership");
  }, []);

  const buy = async (pkg: PurchasesPackage) => {
    setBuyingId(pkg.identifier);
    try {
      const result = await purchase(pkg);
      if (result.ok) {
        await waitForActivation();
      } else if (!result.cancelled) {
        Alert.alert("Couldn't complete purchase", result.message);
      }
    } finally {
      setBuyingId(null);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        Alert.alert("Restored", "Checking your membership status…");
        await waitForActivation();
      } else {
        Alert.alert("Nothing to restore", "No past purchases were found for this account.");
      }
    } finally {
      setRestoring(false);
    }
  };

  if (waitingForWebhook) {
    return (
      <Screen>
        <ScreenHeader title="Subscribe" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <LoadingView />
          <BodyText muted style={{ marginTop: spacing.md, textAlign: "center" }}>
            Confirming your purchase…
          </BodyText>
        </View>
      </Screen>
    );
  }

  if (!purchasesReady()) {
    return (
      <Screen>
        <ScreenHeader title="Subscribe" />
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="In-app purchases aren't set up yet"
            subtitle="For now, subscribe on the website — open shaktiyoga.in/programs in your browser."
          />
          <Button
            style={{ marginTop: spacing.md }}
            onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/programs")}
          >
            Open web checkout
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Subscribe" />
      {packages === null ? (
        <LoadingView />
      ) : packages.length === 0 ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="No plans available right now"
            subtitle="Check back shortly, or subscribe on the website instead."
          />
          <Button
            style={{ marginTop: spacing.md }}
            variant="outline"
            onPress={() => WebBrowser.openBrowserAsync("https://shaktiyoga.in/programs")}
          >
            Open web checkout
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {packages.map((pkg) => (
            <Card key={pkg.identifier} style={styles.card}>
              <Heading size="sm">{pkg.product.title}</Heading>
              {pkg.product.description ? (
                <BodyText muted style={{ marginTop: spacing.xs }}>{pkg.product.description}</BodyText>
              ) : null}
              <BodyText style={{ marginTop: spacing.sm, fontWeight: "700", fontSize: 18 }}>
                {pkg.product.priceString}
              </BodyText>
              <Button
                style={{ marginTop: spacing.md }}
                loading={buyingId === pkg.identifier}
                disabled={buyingId !== null}
                onPress={() => buy(pkg)}
              >
                Subscribe
              </Button>
            </Card>
          ))}

          <Button variant="ghost" loading={restoring} onPress={restore} style={{ marginTop: spacing.sm }}>
            Restore purchases
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
});
