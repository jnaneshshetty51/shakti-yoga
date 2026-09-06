"use client";

interface SparklineProps {
    /** Raw values, oldest → newest. */
    points: number[];
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
 * Tiny dependency-free trend line (inline SVG). No axes, no interactivity —
 * meant to sit in a StatCard footer. Renders nothing useful for < 2 points.
 */
export function Sparkline({
    points,
    width = 96,
    height = 24,
    className = "",
    stroke = CHART_PRIMARY,
    fill = true,
}: SparklineProps) {
    if (!points || points.length < 2) {
        return <div className={className} style={{ width, height }} aria-hidden />;
    }

    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min || 1;
    const stepX = width / (points.length - 1);
    const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);

    const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    const last = points[points.length - 1];

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Trend, latest value ${last}`}
        >
            {fill && <path d={area} fill={stroke} opacity={0.12} />}
            <path
                d={line}
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            <circle cx={width} cy={y(last)} r={2} fill={stroke} />
        </svg>
    );
}
