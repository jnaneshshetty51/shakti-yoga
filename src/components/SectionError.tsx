"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Shared error-boundary UI for a route segment. Keeps the surrounding layout
 * (sidebars, nav) intact — only the segment's content is replaced.
 *
 * Use from a segment `error.tsx`:
 *   "use client";
 *   import SectionError from "@/components/SectionError";
 *   export default function Error(props) { return <SectionError {...props} title="Dashboard" />; }
 */
export default function SectionError({
    error,
    reset,
    title = "This section",
    homeHref = "/",
    homeLabel = "Home",
}: {
    error: Error & { digest?: string };
    reset: () => void;
    title?: string;
    homeHref?: string;
    homeLabel?: string;
}) {
    useEffect(() => {
        console.error(error);
        fetch("/api/client-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: error?.message,
                digest: error?.digest,
                path: typeof window !== "undefined" ? window.location.pathname : null,
            }),
            keepalive: true,
        }).catch(() => { });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
            <div className="max-w-md w-full text-center">
                <p className="font-serif text-3xl text-primary mb-3">{title} hit a snag</p>
                <p className="text-text/60 mb-2">
                    Something went wrong loading this page. It&apos;s been logged.
                </p>
                {error?.digest && (
                    <p className="text-xs text-text/40 mb-8">Ref: {error.digest}</p>
                )}
                {!error?.digest && <div className="mb-8" />}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href={homeHref}
                        className="px-6 py-3 border border-primary text-primary font-bold uppercase tracking-widest text-sm rounded hover:bg-primary/5 transition-colors"
                    >
                        {homeLabel}
                    </Link>
                </div>
            </div>
        </div>
    );
}
