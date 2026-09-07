"use client";

import { useState } from "react";
import { Card, SegmentedControl } from "@/components/admin/ui";
import { TrendChart } from "@/components/admin/TrendChart";
import { CHART_PRIMARY, CHART_SECONDARY } from "@/components/admin/Sparkline";
import type { Dashboard } from "./lib";
import { inrShort } from "./lib";

type SeriesKey = "signups" | "revenue" | "attendance";

const SERIES: Record<SeriesKey, { label: string; color: string; kind: "area" | "bar"; fmt: (v: number) => string }> = {
    signups: { label: "Signups", color: CHART_PRIMARY, kind: "area", fmt: (v) => String(Math.round(v)) },
    revenue: { label: "Revenue", color: CHART_SECONDARY, kind: "bar", fmt: inrShort },
    attendance: { label: "Attendance", color: "#3060a8", kind: "area", fmt: (v) => String(Math.round(v)) },
};

export function TrendPanel({ data, rangeLabel }: { data: Dashboard; rangeLabel: string }) {
    const [key, setKey] = useState<SeriesKey>("signups");
    const cfg = SERIES[key];
    const series = data.trends[key];
    const hasData = series.some((p) => p.value > 0);

    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-hairline">
                <div>
                    <h3 className="font-semibold text-ink">Trend</h3>
                    <p className="text-xs text-ink-subtle">Last {rangeLabel}</p>
                </div>
                <SegmentedControl
                    size="sm"
                    aria-label="Metric"
                    value={key}
                    onChange={setKey}
                    options={[
                        { value: "signups", label: "Signups" },
                        { value: "revenue", label: "Revenue" },
                        { value: "attendance", label: "Attendance" },
                    ]}
                />
            </div>
            <div className="p-5 sm:p-6">
                {hasData ? (
                    <TrendChart
                        series={series}
                        kind={cfg.kind}
                        color={cfg.color}
                        format={cfg.fmt}
                        seriesName={cfg.label}
                        height={220}
                    />
                ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm text-ink-subtle">
                        No {cfg.label.toLowerCase()} recorded in this period.
                    </div>
                )}
            </div>
        </Card>
    );
}
