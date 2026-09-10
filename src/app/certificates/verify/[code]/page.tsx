"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Result {
    valid: boolean;
    holderName?: string;
    title?: string;
    issuedAt?: string;
}

export default function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [state, setState] = useState<"loading" | "signin" | "result">("loading");
    const [result, setResult] = useState<Result | null>(null);

    useEffect(() => {
        fetch(`/api/certificates/verify/${code}`).then(async (res) => {
            if (res.status === 401) { setState("signin"); return; }
            setResult(await res.json());
            setState("result");
        });
    }, [code]);

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <h1 className="font-serif text-2xl text-gray-800 mb-6">Certificate Verification</h1>

            {state === "loading" && <p className="text-gray-400">Checking…</p>}

            {state === "signin" && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                    <p className="mb-3">Sign in to your Shakti account to verify this certificate.</p>
                    <Link href={`/login?from=/certificates/verify/${code}`} className="inline-block px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                        Sign in
                    </Link>
                </div>
            )}

            {state === "result" && result && (
                result.valid ? (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-left">
                        <p className="text-green-700 font-semibold mb-3">✓ Valid certificate</p>
                        <p className="text-sm text-gray-700"><strong>{result.holderName}</strong></p>
                        <p className="text-sm text-gray-600">{result.title}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Issued {result.issuedAt && new Date(result.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>
                ) : (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                        This certificate code is not valid.
                    </div>
                )
            )}
        </div>
    );
}
