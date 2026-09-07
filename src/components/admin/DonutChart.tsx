"use client";

import { useState } from "react";

export type DonutSegment = { label: string; value: number };

const CAT = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)"];

interface DonutChartProps {
    segments: DonutSegment[];
    size?: number;
    thickness?: number;
    centerLabel?: string;
    format?: (v: number) => string;
    className?: string;
}

/**
 * Part-to-whole donut (inline SVG). Categorical palette (validated), 2px
 * surface gap between segments, HTML legend carries name + value + %, per-segment
 * hover. Square viewBox → no distortion.
 */
export function DonutChart({
    segments,
    size = 148,
    thickness = 20,
    centerLabel = "Total",
    format = (v) => v.toLocaleString("en-IN"),
    className = "",
}: DonutChartProps) {
    const [hover, setHover] = useState<number | null>(null);
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = (size - thickness) / 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const gap = total > 0 ? 2 : 0; // px gap rendered as dash

    let offset = 0;
    const arcs = segments.map((seg, i) => {
        const frac = total > 0 ? seg.value / total : 0;
        const len = Math.max(0, frac * circ - gap);
        const dash = `${len} ${circ - len}`;
        const dashOffset = -offset;
        offset += frac * circ;
        return { seg, i, dash, dashOffset, frac };
    });

    return (
        <div className={`flex flex-col items-center gap-5 ${className}`}>
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block -rotate-90">
                    <circle cx={c} cy={c} r={r} fill="none" stroke="rgb(var(--surface-hover))" strokeWidth={thickness} />
                    {total > 0 && arcs.map(({ i, dash, dashOffset }) => (
                        <circle
                            key={i}
                            cx={c}
                            cy={c}
                            r={r}
                            fill="none"
                            stroke={CAT[i % CAT.length]}
                            strokeWidth={thickness}
                            strokeDasharray={dash}
                            strokeDashoffset={dashOffset}
                            opacity={hover === null || hover === i ? 1 : 0.35}
                            style={{ transition: "opacity .12s" }}
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-semibold text-ink num">
                        {hover === null ? format(total) : format(segments[hover].value)}
                    </span>
                    <span className="text-[11px] text-ink-subtle uppercase tracking-wider">
                        {hover === null ? centerLabel : segments[hover].label}
                    </span>
                </div>
            </div>

            <ul className="flex-1 min-w-0 space-y-2.5 w-full">
                {segments.map((seg, i) => (
                    <li
                        key={seg.label}
                        className="flex items-center gap-2.5 text-sm"
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: CAT[i % CAT.length] }} />
                        <span className="text-ink-muted flex-1 min-w-0 leading-tight">{seg.label}</span>
                        <span className="text-ink font-medium num shrink-0">{format(seg.value)}</span>
                        <span className="text-ink-subtle num w-9 text-right shrink-0">
                            {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : "—"}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
