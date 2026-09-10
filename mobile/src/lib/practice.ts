import type { PracticeLevel } from "@/lib/types";

export const LEVEL_LABEL: Record<PracticeLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ALL_LEVELS: "All levels",
};

export const PRACTICE_LEVELS: PracticeLevel[] = ["BEGINNER", "INTERMEDIATE", "ALL_LEVELS"];

/** The 11 ContentCategory values, shared by content + practice filtering. */
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
  "STUDIO",
  "COMMUNITY",
] as const;

export function categoryLabel(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}
