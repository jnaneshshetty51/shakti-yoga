"use client";

import SectionError from "@/components/SectionError";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="Your dashboard" homeHref="/dashboard" homeLabel="Dashboard home" />;
}
