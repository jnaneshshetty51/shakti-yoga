import { router } from "expo-router";
import type { Cta } from "@/lib/types";

/** Resolve a content CTA to a navigation action. */
export function runCta(cta: Cta): void {
  switch (cta.type) {
    case "join_next_class":
    case "view_classes":
      router.push("/(tabs)/classes");
      break;
    case "book_therapy":
      router.push("/therapy-intake");
      break;
    case "open_blog":
      if (cta.blogId) router.push(`/content/${cta.blogId}`);
      break;
    case "open_practice":
      if (cta.practiceId) router.push(`/practice/${cta.practiceId}`);
      else router.push("/practices");
      break;
    default:
      break;
  }
}

export function ctaLabel(cta: Cta): string {
  if (cta.label) return cta.label;
  return (
    {
      join_next_class: "Join the next class",
      view_classes: "See the timetable",
      book_therapy: "Begin Yoga Therapy",
      open_blog: "Read more",
      open_practice: "Open the practice",
      none: "",
    } as const
  )[cta.type];
}
