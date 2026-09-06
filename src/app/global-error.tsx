"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", textAlign: "center", color: "#1f211c", background: "#f5f6f3" }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", color: "#496a3f" }}>Something broke</h1>
                <p style={{ color: "#5b5f55", margin: "1rem 0 2rem" }}>An unexpected error occurred. {error.digest ? `Ref: ${error.digest}` : ""}</p>
                <button onClick={reset} style={{ padding: "0.75rem 1.5rem", background: "#496a3f", color: "#fff", border: 0, borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer" }}>
                    Try again
                </button>
            </body>
        </html>
    );
}
