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
    const [state, setState] = useState<"loading" | "result" | "error">("loading");
    const [result, setResult] = useState<Result | null>(null);

    const check = () => {
        setState("loading");
        fetch(`/api/certificates/verify/${code}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(String(res.status));
                setResult(await res.json());
                setState("result");
            })
            .catch(() => setState("error"));
    };

    useEffect(() => {
        check();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <h1 className="font-serif text-2xl text-gray-800 mb-6">Certificate Verification</h1>

            {state === "loading" && <p className="text-gray-400">Checking…</p>}

            {state === "error" && (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                    <p className="mb-3">Couldn&rsquo;t reach the verification service. Please try again.</p>
                    <button onClick={check} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                        Retry
                    </button>
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

            <Link href="/certificates/verify" className="inline-block mt-6 text-sm text-gray-500 hover:text-primary transition-colors">
                Verify another certificate
            </Link>
        </div>
    );
}
