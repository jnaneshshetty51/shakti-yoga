import React from "react";
import { Screen, LoadingView } from "@/components/ui";

/**
 * The `/` route. `AuthGate` in the root layout does all the redirecting
 * (cold start and every login/logout); this just renders while that resolves.
 */
export default function Index() {
  return (
    <Screen>
      <LoadingView />
    </Screen>
  );
}
