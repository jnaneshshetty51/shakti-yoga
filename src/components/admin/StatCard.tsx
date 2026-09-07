"use client";

import { ReactNode } from "react";
import { Sparkline, CHART_PRIMARY, CHART_SECONDARY } from "./Sparkline";

type Accent = "green" | "terracotta" | "blue" | "amber";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  accent?: Accent;
  trend?: "up" | "down" | "stable";
  prefix?: string;
  suffix?: string;
  /** Optional mini trend line, oldest → newest. */
  spark?: number[];
}

const ACCENTS: Record<Accent, { tile: string; icon: string; spark: string }> = {
  green: { tile: "bg-brand/10", icon: "text-brand", spark: CHART_PRIMARY },
  terracotta: { tile: "bg-secondary/15", icon: "text-secondary", spark: CHART_SECONDARY },
  blue: { tile: "bg-blue-50", icon: "text-blue-600", spark: "#3060a8" },
  amber: { tile: "bg-amber-50", icon: "text-amber-600", spark: "#b07d2b" },
};

const trendIcons = { up: "↑", down: "↓", stable: "→" } as const;

/** 1,284 · 12.9K · 3.4M — compact large integers; pass-through for strings. */
function compactValue(value: string | number, prefix: string, suffix: string): string {
  if (typeof value !== "number") return `${prefix}${value}${suffix}`;
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1_000_000) body = `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  else if (abs >= 10_000) body = `${(value / 1_000).toFixed(0)}K`;
  else body = value.toLocaleString("en-IN");
  return `${prefix}${body}${suffix}`;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "positive",
  icon,
  accent = "green",
  trend,
  prefix = "",
  suffix = "",
  spark,
}: StatCardProps) {
  const a = ACCENTS[accent];
  const changeColor =
    changeType === "positive" ? "text-ok"
      : changeType === "negative" ? "text-danger"
        : "text-ink-subtle";

  // Only show a sparkline when there's an actual shape to read.
  const hasSpark = !!spark && spark.length > 1 && new Set(spark).size > 1;
  const [changeHead, changeTail] = change ? change.split(" vs ") : [undefined, undefined];

  return (
    <div className="bg-surface p-5 rounded-card border border-hairline shadow-raised transition-shadow hover:shadow-overlay">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-10 h-10 shrink-0 rounded-control flex items-center justify-center text-lg ${a.tile} ${a.icon}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider leading-tight">
            {title}
          </div>
          <div className="text-[26px] leading-tight font-semibold text-ink mt-1 num">
            {compactValue(value, prefix, suffix)}
          </div>
          {change && (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-xs">
              <span className={`font-semibold ${changeColor}`}>
                {trend && trendIcons[trend]} {changeHead}
              </span>
              {changeTail && <span className="text-ink-subtle">vs {changeTail}</span>}
            </div>
          )}
        </div>
      </div>
      {hasSpark && (
        <Sparkline points={spark!} stroke={a.spark} width={240} height={28} className="mt-3 w-full opacity-90" />
      )}
    </div>
  );
}
