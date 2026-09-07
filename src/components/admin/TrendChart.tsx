"use client";

import { useId, useMemo, useState } from "react";
import { useChartSize } from "./useChartSize";
import { CHART_PRIMARY } from "./Sparkline";

export type TrendPoint = { label: string; value: number };

interface TrendChartProps {
    series: TrendPoint[];
    kind?: "area" | "bar";
    height?: number;
    color?: string;
    /** Format a value for the axis + tooltip. */
    format?: (v: number) => string;
    /** Names the single series for screen readers + the tooltip. */
    seriesName?: string;
    className?: string;
}

const PAD_T = 10;
const PAD_B = 24;
const PAD_L = 46;
const PAD_R = 10;
const MAX_BAR = 24;

/** "Nice" rounded axis ceiling + step for ~`count` gridlines. */
function niceScale(max: number, count = 4): { top: number; step: number } {
    if (max <= 0) return { top: 1, step: 1 };
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    const step = nice * mag;
    return { top: Math.ceil(max / step) * step, step };
}

/**
 * Dependency-free area / bar chart (inline SVG), rendered at the measured
 * container width so geometry and text never distort. Crosshair + HTML tooltip
 * on hover / arrow keys; hairline gridlines; clean rounded y-ticks.
 */
export function TrendChart({
    series,
    kind = "area",
    height = 200,
    color = CHART_PRIMARY,
    format = (v) => String(Math.round(v)),
    seriesName = "value",
    className = "",
}: TrendChartProps) {
    const gid = useId().replace(/[:]/g, "");
    const { ref, width } = useChartSize(640);
    const [active, setActive] = useState<number | null>(null);

    const n = series.length;
    const { top, step } = useMemo(
        () => niceScale(Math.max(1, ...series.map((p) => p.value))),
        [series],
    );

    if (n === 0) {
        return (
            <div ref={ref} className={`flex items-center justify-center text-sm text-ink-subtle ${className}`} style={{ height }}>
                No data for this period.
            </div>
        );
    }

    const plotW = Math.max(width - PAD_L - PAD_R, 10);
    const plotH = height - PAD_T - PAD_B;
    const x = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD_T + plotH - (v / top) * plotH;

    const ticks: number[] = [];
    for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v);

    const labelEvery = Math.max(1, Math.ceil(n / (width < 500 ? 4 : 7)));
    const barW = Math.min(MAX_BAR, (plotW / n) * 0.62);

    const linePath = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

    const move = (clientX: number, rect: DOMRect) => {
        const px = clientX - rect.left - PAD_L;
        const i = n === 1 ? 0 : Math.round((px / plotW) * (n - 1));
        setActive(Math.max(0, Math.min(n - 1, i)));
    };

    const activePt = active !== null ? series[active] : null;
    const tipX = active !== null ? x(active) : 0;
    const tipFlip = tipX > width - 110;

    return (
        <div ref={ref} className={`relative ${className}`} style={{ height }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="block overflow-visible"
                role="img"
                aria-label={`${seriesName} over time. Latest: ${format(series[n - 1].value)}.`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") { e.preventDefault(); setActive((a) => Math.max(0, (a ?? n) - 1)); }
                    if (e.key === "ArrowRight") { e.preventDefault(); setActive((a) => Math.min(n - 1, (a ?? -1) + 1)); }
                    if (e.key === "Escape") setActive(null);
                }}
                onMouseLeave={() => setActive(null)}
                onMouseMove={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())}
                onTouchStart={(e) => move(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
                onTouchMove={(e) => move(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
            >
                <defs>
                    <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.14} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                </defs>

                {ticks.map((v) => {
                    const gy = y(v);
                    return (
                        <g key={v}>
                            <line x1={PAD_L} y1={gy} x2={width - PAD_R} y2={gy} stroke="var(--chart-grid)" strokeWidth={1} />
                            <text x={PAD_L - 8} y={gy + 3.5} fontSize={10} textAnchor="end" fill="rgb(var(--ink-subtle))" className="num">
                                {format(v)}
                            </text>
                        </g>
                    );
                })}

                {kind === "area" ? (
                    <>
                        <path d={areaPath} fill={`url(#grad-${gid})`} />
                        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    </>
                ) : (
                    series.map((p, i) => (
                        <rect
                            key={i}
                            x={x(i) - barW / 2}
                            y={y(p.value)}
                            width={barW}
                            height={Math.max(0, PAD_T + plotH - y(p.value))}
                            rx={3}
                            fill={color}
                            opacity={active === null || active === i ? 0.9 : 0.4}
                        />
                    ))
                )}

                {series.map((p, i) =>
                    i % labelEvery === 0 || i === n - 1 ? (
                        <text
                            key={i}
                            x={x(i)}
                            y={height - 7}
                            fontSize={10}
                            fill="rgb(var(--ink-subtle))"
                            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                        >
                            {p.label}
                        </text>
                    ) : null,
                )}

                {active !== null && (
                    <>
                        <line x1={x(active)} y1={PAD_T} x2={x(active)} y2={PAD_T + plotH} stroke="rgb(var(--border-strong))" strokeWidth={1} />
                        <circle cx={x(active)} cy={y(series[active].value)} r={4} fill={color} stroke="rgb(var(--surface))" strokeWidth={2} />
                    </>
                )}
                {kind === "area" && active === null && (
                    <circle cx={x(n - 1)} cy={y(series[n - 1].value)} r={4} fill={color} stroke="rgb(var(--surface))" strokeWidth={2} />
                )}
            </svg>

            {activePt && (
                <div
                    className="pointer-events-none absolute z-10 -translate-y-1 rounded-control border border-hairline bg-surface px-2.5 py-1.5 shadow-overlay text-xs"
                    style={{
                        left: tipFlip ? undefined : tipX,
                        right: tipFlip ? Math.max(0, width - tipX) : undefined,
                        top: 0,
                    }}
                >
                    <div className="text-ink-subtle">{activePt.label}</div>
                    <div className="font-semibold text-ink num">{format(activePt.value)}</div>
                </div>
            )}
        </div>
    );
}
