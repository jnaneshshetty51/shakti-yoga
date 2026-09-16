/**
 * Resolve a Content item's admin-configured CTA (ctaType/ctaLabel) to a public
 * website destination + label. Mirrors mobile/src/lib/contentCta.ts's
 * resolution table, but against public marketing routes (the reader isn't
 * necessarily signed in) instead of the authenticated app's tab routes.
 */
export interface ResolvedCta {
    href: string;
    label: string;
    heading: string;
}

const DEFAULT_LABEL: Record<string, string> = {
    join_next_class: "See today's schedule",
    view_classes: "See the timetable",
    book_therapy: "Begin Yoga Therapy",
    open_content: "Read more",
    open_practice: "Try the practice",
};

const HEADING: Record<string, string> = {
    join_next_class: "Ready to join a class?",
    view_classes: "Ready to practice?",
    book_therapy: "Curious about Yoga Therapy?",
    open_content: "Keep exploring",
    open_practice: "Try it for yourself",
};

export function resolveContentCta(
    ctaType: string | null | undefined,
    ctaLabel: string | null | undefined,
    relatedContentId: string | null | undefined,
): ResolvedCta | null {
    if (!ctaType || ctaType === "none") return null;

    const href = (() => {
        switch (ctaType) {
            case "join_next_class":
            case "view_classes":
                return "/everyday-yoga";
            case "book_therapy":
                return "/yoga-therapy";
            case "open_content":
            case "open_practice":
                return relatedContentId ? `/content/${relatedContentId}` : null;
            default:
                return null;
        }
    })();
    if (!href) return null;

    return {
        href,
        label: ctaLabel || DEFAULT_LABEL[ctaType] || "Learn more",
        heading: HEADING[ctaType] || "Ready to practice?",
    };
}
