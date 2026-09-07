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
  green: { tile: "bg-primary/10", icon: "text-primary", spark: CHART_PRIMARY },
  terracotta: { tile: "bg-secondary/15", icon: "text-secondary", spark: CHART_SECONDARY },
  blue: { tile: "bg-blue-50", icon: "text-blue-600", spark: "#2563eb" },
  amber: { tile: "bg-amber-50", icon: "text-amber-600", spark: "#d97706" },
};

const trendIcons = { up: "↑", down: "↓", stable: "→" } as const;

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
    changeType === "positive"
      ? "text-green-600"
      : changeType === "negative"
        ? "text-red-600"
        : "text-gray-500";

  const hasSpark = !!spark && spark.length > 1;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.04)] border border-gray-100 hover:shadow-[0_4px_16px_rgba(16,24,40,0.08)] transition-shadow">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${a.tile} ${a.icon}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
            {title}
          </div>
          <div className="text-[26px] leading-tight font-bold text-gray-900 mt-1">
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </div>
          {change && (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-xs">
              <span className={`font-semibold ${changeColor}`}>
                {trend && trendIcons[trend]} {change.split(" vs ")[0]}
              </span>
              {change.includes(" vs ") && (
                <span className="text-gray-400">vs {change.split(" vs ")[1]}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {hasSpark && (
        <Sparkline points={spark!} stroke={a.spark} width={240} height={32} className="mt-3 w-full" />
      )}
    </div>
  );
}
