"use client";

import { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  trend?: "up" | "down" | "stable";
  prefix?: string;
  suffix?: string;
  /** Optional mini trend line, oldest → newest. */
  spark?: number[];
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "positive", 
  icon, 
  trend,
  prefix = "",
  suffix = "",
  spark,
}: StatCardProps) {
  const changeColors = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50",
  };

  const trendIcons = {
    up: "↑",
    down: "↓",
    stable: "→",
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </div>
        {icon && (
          <div className="p-2 bg-primary/5 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </div>
          {change && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
              {trend && trendIcons[trend]}
              <span>{change}</span>
            </div>
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline points={spark} className="shrink-0 opacity-80" />
        )}
      </div>
    </div>
  );
}
