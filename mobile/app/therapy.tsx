import React from "react";
import { Screen } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TherapyScheduleView } from "@/components/TherapyScheduleView";

/** Pushed route — reached from Home (inactive therapy members) and More. */
export default function TherapyScheduleScreen() {
  return (
    <Screen>
      <ScreenHeader title="My Therapy" />
      <TherapyScheduleView />
    </Screen>
  );
}
