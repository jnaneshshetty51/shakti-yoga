'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Region } from '@/lib/pricing';

const OPTS: { region: Region; label: string; sym: string }[] = [
    { region: 'IN', label: 'India', sym: '₹' },
    { region: 'INTL', label: 'International', sym: '$' },
];

/**
 * ₹ / $ pricing switcher. Pins the choice via `/api/region` (cookie) and
 * refreshes so server-rendered prices update.
 */
export default function CurrencyToggle({ region: initial, className = '' }: { region: Region; className?: string }) {
    const router = useRouter();
    const [region, setRegion] = useState<Region>(initial);
    const [pending, startTransition] = useTransition();

    const pick = (next: Region) => {
        if (next === region || pending) return;
        setRegion(next);
        fetch('/api/region', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ region: next }),
        })
            .catch(() => {})
            .finally(() => startTransition(() => router.refresh()));
    };

    return (
        <div
            className={`inline-flex items-center rounded-full border border-primary/20 bg-white p-1 ${className}`}
            role="group"
            aria-label="Currency"
        >
            {OPTS.map((o) => {
                const active = region === o.region;
                return (
                    <button
                        key={o.region}
                        type="button"
                        onClick={() => pick(o.region)}
                        aria-pressed={active}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-sans font-bold transition-colors ${
                            active ? 'bg-primary text-white' : 'text-text/60 hover:text-text'
                        }`}
                    >
                        {o.sym} {o.label}
                    </button>
                );
            })}
        </div>
    );
}
