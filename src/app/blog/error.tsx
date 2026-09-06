"use client";

import SectionError from "@/components/SectionError";

export default function BlogError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="The journal" homeHref="/blog" homeLabel="All articles" />;
}
