import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Start Your 7-Day Free Trial",
    description: "Try Shakti Yoga free for 7 days — full access to every live Everyday Yoga class. No card required.",
    alternates: { canonical: "/trial" },
};

export default function TrialLayout({ children }: { children: React.ReactNode }) {
    return children;
}
