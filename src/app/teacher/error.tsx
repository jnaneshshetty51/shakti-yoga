"use client";

import SectionError from "@/components/SectionError";

export default function TeacherError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="This page" homeHref="/teacher" homeLabel="Today" />;
}
