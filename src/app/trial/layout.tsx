import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Book Your Free Trial Class",
    description: "Experience your first session free with Shakti Yoga — 1 live Everyday Yoga group class. No card required.",
    alternates: { canonical: "/trial" },
};

export default function TrialLayout({ children }: { children: React.ReactNode }) {
    return children;
}
