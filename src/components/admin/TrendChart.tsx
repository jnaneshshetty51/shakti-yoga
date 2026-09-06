"use client";

import { useId } from "react";
import { CHART_PRIMARY } from "./Sparkline";

export type TrendPoint = { label: string; value: number };

interface TrendChartProps {
    series: TrendPoint[];
    kind?: "area" | "bar";
    height?: number;
    color?: string;
    /** Format a value for the axis + hover tooltip. */
    format?: (v: number) => string;
    className?: string;
}

const VIEW_W = 640;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;

/**
 * Dependency-free area / bar chart (inline SVG). Faint gridlines, thinned x-axis
 * labels, native `<title>` tooltips per point. Scrolls horizontally on narrow
 * screens rather than squashing.
 */
export function TrendChart({
    series,
    kind = "area",
    height = 192,
    color = CHART_PRIMARY,
    format = (v) => String(v),
    className = "",
}: TrendChartProps) {
    const gid = useId().replace(/[:]/g, "");

    if (!series || series.length === 0) {
        return (
            <div className={`flex items-center justify-center text-sm text-gray-400 ${className}`} style={{ height }}>
                No data for this period.
            </div>
        );
    }

    const max = Math.max(1, ...series.map((p) => p.value));
    const plotH = height - PAD_T - PAD_B;
    const plotW = VIEW_W - PAD_L - PAD_R;
    const n = series.length;

    const x = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD_T + plotH - (v / max) * plotH;

    const barW = kind === "bar" ? Math.max(2, (plotW / n) * 0.6) : 0;
    const gridLines = [0, 0.25, 0.5, 0.75, 1];
    const labelEvery = Math.max(1, Math.ceil(n / 6));

    const linePath = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${PAD_T + plotH} L${x(0).toFixed(1)},${PAD_T + plotH} Z`;

    return (
        <div className={`overflow-x-auto ${className}`}>
            <svg
                viewBox={`0 0 ${VIEW_W} ${height}`}
                width="100%"
                height={height}
                preserveAspectRatio="none"
                role="img"
                aria-label="Trend chart"
                style={{ minWidth: n > 20 ? 640 : undefined }}
            >
                <defs>
                    <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                </defs>

                {gridLines.map((g) => {
                    const gy = PAD_T + plotH - g * plotH;
                    return (
                        <g key={g}>
                            <line x1={PAD_L} y1={gy} x2={VIEW_W - PAD_R} y2={gy} stroke="#e5e7eb" strokeWidth={1} />
                            <text x={0} y={gy - 2} fontSize={9} fill="#9ca3af">
                                {format(Math.round(g * max))}
                            </text>
                        </g>
                    );
                })}

                {kind === "area" ? (
                    <>
                        <path d={areaPath} fill={`url(#grad-${gid})`} />
                        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    </>
                ) : (
                    series.map((p, i) => (
                        <rect
                            key={i}
                            x={x(i) - barW / 2}
                            y={y(p.value)}
                            width={barW}
                            height={Math.max(0, PAD_T + plotH - y(p.value))}
                            rx={1.5}
                            fill={color}
                            opacity={0.85}
                        >
                            <title>{`${p.label}: ${format(p.value)}`}</title>
                        </rect>
                    ))
                )}

                {kind === "area" &&
                    series.map((p, i) => (
                        <circle key={i} cx={x(i)} cy={y(p.value)} r={7} fill="transparent">
                            <title>{`${p.label}: ${format(p.value)}`}</title>
                        </circle>
                    ))}

                {series.map((p, i) =>
                    i % labelEvery === 0 || i === n - 1 ? (
                        <text key={i} x={x(i)} y={height - 6} fontSize={9} fill="#9ca3af" textAnchor="middle">
                            {p.label}
                        </text>
                    ) : null,
                )}
            </svg>
        </div>
    );
}
