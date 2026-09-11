"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuAward, LuDownload, LuLink } from "react-icons/lu";
import { PageHeader, PageLoading, Card, EmptyState, ErrorState, Button } from "@/components/ui";

interface Certificate {
    id: string;
    title: string;
    reason: string | null;
    verificationCode: string;
    approvedAt: string | null;
    issuedAt: string;
}

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState<Certificate[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/certificates");
            if (!res.ok) throw new Error(String(res.status));
            setCertificates((await res.json()).certificates || []);
            setLoadError(null);
        } catch {
            setLoadError("Could not load your certificates.");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const copyLink = async (code: string) => {
        const url = `${window.location.origin}/certificates/verify/${code}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    if (!certificates && loadError) return <ErrorState message={loadError} onRetry={load} />;
    if (!certificates) return <PageLoading title="My Certificates" />;

    return (
        <div>
            <PageHeader title="My Certificates" subtitle="Certificates earned through challenges and milestones." />

            {certificates.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={LuAward}
                        title="No certificates yet"
                        hint="Complete a challenge to earn your first one."
                        action={
                            <Link href="/dashboard/practices" className="inline-flex px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                                Browse challenges
                            </Link>
                        }
                    />
                </Card>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {certificates.map((c) => (
                        <Card key={c.id} padded>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <LuAward />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-800">{c.title}</h3>
                                    {c.reason && <p className="text-sm text-gray-500 mt-0.5">{c.reason}</p>}
                                    <p className="text-xs text-gray-400 mt-1">
                                        Issued {new Date(c.approvedAt ?? c.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button size="sm" icon={LuDownload} onClick={() => window.open(`/api/certificates/${c.id}/download`, "_blank")}>
                                    Download
                                </Button>
                                <Button size="sm" variant="secondary" icon={LuLink} onClick={() => copyLink(c.verificationCode)}>
                                    {copied === c.verificationCode ? "Copied" : "Copy verify link"}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
