import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Success Stories",
    description: "Real results from Shakti Yoga members — pain relief, calmer minds, and a practice that finally stuck.",
    alternates: { canonical: "/stories" },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
    return children;
}
