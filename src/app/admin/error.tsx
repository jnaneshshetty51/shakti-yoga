"use client";

import SectionError from "@/components/SectionError";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="This admin page" homeHref="/admin" homeLabel="Admin home" />;
}
