"use client";

import SectionError from "@/components/SectionError";

export default function OnboardingError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="Onboarding" homeHref="/dashboard" homeLabel="Skip to dashboard" />;
}
