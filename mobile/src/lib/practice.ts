import type { PracticeLevel } from "@/lib/types";

export const LEVEL_LABEL: Record<PracticeLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ALL_LEVELS: "All levels",
  ADVANCED: "Advanced",
};

export const PRACTICE_LEVELS: PracticeLevel[] = ["BEGINNER", "INTERMEDIATE", "ALL_LEVELS", "ADVANCED"];

/** The ContentCategory values, shared by content + practice filtering. */
export const CONTENT_CATEGORIES = [
  "YOGA",
  "BREATHING",
  "MINDFULNESS",
  "MOBILITY",
  "SLEEP",
  "STRENGTH",
  "WELLNESS",
  "BEGINNERS",
  "PHILOSOPHY",
  "THERAPY",
  "STUDIO",
  "COMMUNITY",
] as const;

const CATEGORY_LABEL_OVERRIDE: Record<string, string> = { MINDFULNESS: "Meditation" };

export function categoryLabel(cat: string): string {
  return CATEGORY_LABEL_OVERRIDE[cat] ?? cat.charAt(0) + cat.slice(1).toLowerCase();
}
