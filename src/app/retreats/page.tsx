"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Retreat {
    id: string;
    kind: "RETREAT" | "WORKSHOP" | "EVENT";
    name: string;
    location: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    price: number | null;
    currency: string;
}

const KIND_LABEL: Record<string, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };

function dateRange(start: string, end: string) {
    const s = new Date(start), e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return s.toDateString() === e.toDateString()
        ? s.toLocaleDateString("en-IN", opts)
        : `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

export default function RetreatsPage() {
    const [retreats, setRetreats] = useState<Retreat[] | null>(null);

    useEffect(() => {
        fetch("/api/retreats").then((r) => r.json()).then((d) => setRetreats(d.retreats || []));
    }, []);

    return (
        <div className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="font-serif text-3xl text-gray-800 mb-2">Retreats & Events</h1>
            <p className="text-gray-500 mb-8">Immersive experiences beyond the daily practice.</p>

            {!retreats ? (
                <p className="text-gray-400">Loading…</p>
            ) : retreats.length === 0 ? (
                <p className="text-gray-400">Nothing scheduled right now — check back soon.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {retreats.map((r) => (
                        <Link
                            key={r.id}
                            href={`/retreats/${r.id}`}
                            className="block bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 hover:shadow-md transition-shadow"
                        >
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{KIND_LABEL[r.kind]}</span>
                            <h2 className="font-serif text-xl text-gray-800 mt-1">{r.name}</h2>
                            <p className="text-sm text-gray-500 mt-1">{dateRange(r.startDate, r.endDate)}</p>
                            {r.location && <p className="text-sm text-gray-500">{r.location}</p>}
                            {r.price != null && (
                                <p className="text-sm font-semibold text-gray-800 mt-2">
                                    {r.currency === "USD" ? "$" : "₹"}{r.price.toLocaleString("en-IN")}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
