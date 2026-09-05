"use client";

import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple" | "pink" | "orange" | "teal";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
  orange: "bg-orange-100 text-orange-700",
  teal: "bg-teal-100 text-teal-700",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
};

export function Badge({ variant = "default", children, className = "", dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}></span>
      )}
      {children}
    </span>
  );
}

// Status badge with predefined mappings
type StatusType = 
  | "active" | "inactive" | "pending" | "confirmed" | "completed" | "cancelled" 
  | "trial" | "new" | "converted" | "lost" | "draft" | "published" | "archived";

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "default",
  pending: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "error",
  trial: "purple",
  new: "info",
  converted: "success",
  lost: "default",
  draft: "default",
  published: "success",
  archived: "default",
};

export function StatusBadge({ status }: { status: StatusType | (string & {}) }) {
  const variant = statusVariantMap[status.toLowerCase()] || "default";
  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  );
}
