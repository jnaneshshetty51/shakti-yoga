"use client";

import { useChartSize } from "./useChartSize";

interface SparklineProps {
    /** Raw values, oldest → newest. */
    points: number[];
    /** Fallback width before the container is measured. */
    width?: number;
    height?: number;
    className?: string;
    /** Stroke colour. Defaults to the theme primary (#4A6741). */
    stroke?: string;
    /** Draw a faint fill under the line. */
    fill?: boolean;
}

/** tailwind.config.ts `primary` — kept in sync manually (no CSS var for it). */
export const CHART_PRIMARY = "#4A6741";
export const CHART_SECONDARY = "#C68E5D";

/**
 * Tiny dependency-free trend line (inline SVG). Renders at the measured
 * container width so the geometry never distorts. No axes, no interactivity.
 */
export function Sparkline({
    points,
    width = 120,
    height = 32,
    className = "",
    stroke = CHART_PRIMARY,
    fill = true,
}: SparklineProps) {
    const { ref, width: measured } = useChartSize(width);
    const w = Math.max(measured, 24);

    if (!points || points.length < 2) {
        return <div ref={ref} className={className} style={{ height }} aria-hidden />;
    }

    const pad = 3;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min || 1;
    const stepX = (w - pad * 2) / (points.length - 1);
    const x = (i: number) => pad + i * stepX;
    const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

    const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(2)},${height} L${x(0).toFixed(2)},${height} Z`;
    const last = points[points.length - 1];

    return (
        <div ref={ref} className={className}>
            <svg
                width={w}
                height={height}
                viewBox={`0 0 ${w} ${height}`}
                role="img"
                aria-label={`Trend, latest value ${last}`}
                className="block"
            >
                {fill && <path d={area} fill={stroke} opacity={0.1} />}
                <path
                    d={line}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <circle cx={x(points.length - 1)} cy={y(last)} r={2.5} fill={stroke} stroke="rgb(var(--surface))" strokeWidth={1.5} />
            </svg>
        </div>
    );
}
