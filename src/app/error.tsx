"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
        // Best-effort client error report; ignored if the sink isn't there.
        fetch("/api/client-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: error.message,
                digest: error.digest,
                path: typeof window !== "undefined" ? window.location.pathname : null,
            }),
            keepalive: true,
        }).catch(() => { });
    }, [error]);

    return (
        <main className="min-h-[70vh] flex items-center justify-center bg-accent/20 px-4 py-20">
            <div className="max-w-md w-full text-center">
                <p className="font-serif text-5xl text-primary mb-4">Something broke</p>
                <p className="text-text/60 mb-8">
                    We hit an unexpected error. It&apos;s been logged. Try again, or head back home.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={reset} className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors">
                        Try again
                    </button>
                    <Link href="/" className="px-6 py-3 border border-primary text-primary font-bold uppercase tracking-widest text-sm rounded hover:bg-primary/5 transition-colors">
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
