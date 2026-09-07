"use client";

/**
 * Shared admin design-system primitives. Every /admin screen composes these so
 * headers, cards, badges, tabs and empty states stay visually consistent.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuArrowRight } from "react-icons/lu";

/* ---------------- PageHeader ---------------- */

export function PageHeader({
    title,
    subtitle,
    eyebrow,
    children,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    eyebrow?: ReactNode;
    /** Right-aligned actions (buttons, selects). */
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div className="min-w-0">
                {eyebrow && <p className="text-sm text-gray-400">{eyebrow}</p>}
                <h1 className="font-serif text-[26px] leading-tight text-gray-800">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{subtitle}</p>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
        </div>
    );
}

/* ---------------- Card ---------------- */

export function Card({
    children,
    className = "",
    padded = false,
}: {
    children: ReactNode;
    className?: string;
    padded?: boolean;
}) {
    return (
        <div
            className={`bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] ${padded ? "p-5 sm:p-6" : ""} ${className}`}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    subtitle,
    action,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
            <div className="min-w-0">
                <h3 className="font-bold text-gray-800">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/* ---------------- Badge ---------------- */

export type Tone = "green" | "amber" | "red" | "blue" | "purple" | "gray" | "teal";

const TONE: Record<Tone, string> = {
    green: "bg-green-50 text-green-700 ring-green-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
    purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
    teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
    gray: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

export function Badge({
    children,
    tone = "gray",
    className = "",
}: {
    children: ReactNode;
    tone?: Tone;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[tone]} ${className}`}
        >
            {children}
        </span>
    );
}

/** Map a free-form status string to a Badge tone. */
export function statusTone(status: string): Tone {
    const s = status.toLowerCase();
    if (/(active|confirmed|converted|published|completed|paid|connected|success)/.test(s)) return "green";
    if (/(pending|contacted|paused|draft|scheduled|processing|trial)/.test(s)) return "amber";
    if (/(cancelled|canceled|lost|failed|expired|inactive|error|no.?show)/.test(s)) return "red";
    if (/(new|open)/.test(s)) return "blue";
    return "gray";
}

export function StatusBadge({ status }: { status: string }) {
    return <Badge tone={statusTone(status)}>{status}</Badge>;
}

/* ---------------- Button ---------------- */

type ButtonProps = {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    icon?: IconType;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT = {
    primary: "bg-primary text-white hover:bg-primary/90 border-transparent",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border-transparent",
    danger: "bg-white text-red-600 hover:bg-red-50 border-red-200",
};

export function Button({
    children,
    variant = "primary",
    size = "md",
    icon: Icon,
    className = "",
    ...rest
}: ButtonProps) {
    return (
        <button
            {...rest}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            } ${VARIANT[variant]} ${className}`}
        >
            {Icon && <Icon className="text-[1.1em]" />}
            {children}
        </button>
    );
}

/* ---------------- Tabs ---------------- */

export function Tabs<T extends string>({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: T; label: string; count?: number | string }[];
    active: T;
    onChange: (key: T) => void;
}) {
    return (
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-full">
            {tabs.map((t) => {
                const on = t.key === active;
                return (
                    <button
                        key={t.key}
                        onClick={() => onChange(t.key)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            on ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                        }`}
                    >
                        {t.label}
                        {t.count !== undefined && (
                            <span
                                className={`text-xs rounded-full px-1.5 py-0.5 ${
                                    on ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-500"
                                }`}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({
    icon: Icon,
    title,
    hint,
    action,
}: {
    icon?: IconType;
    title: string;
    hint?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-14 px-6">
            {Icon && (
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-3">
                    <Icon />
                </div>
            )}
            <p className="font-medium text-gray-700">{title}</p>
            {hint && <p className="text-sm text-gray-500 mt-1 max-w-sm">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/* ---------------- Loading ---------------- */

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse bg-gray-200/70 rounded-xl ${className}`} />;
}

export function PageLoading({ title }: { title?: string }) {
    return (
        <div>
            {title ? (
                <h1 className="font-serif text-[26px] text-gray-800 mb-8">{title}</h1>
            ) : (
                <div className="mb-8 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-72 max-w-full" />
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
        </div>
    );
}

/* ---------------- ErrorState ---------------- */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <Card padded className="text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-gray-700 mb-4">{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </Card>
    );
}

/* ---------------- Inline form field styles ---------------- */

export const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition";
export const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1";

/* ---------------- Table row actions ---------------- */

export function TableActions({ children }: { children: ReactNode }) {
    return <div className="flex justify-end items-center gap-3">{children}</div>;
}

export function ActionButton({
    children,
    tone = "primary",
    ...rest
}: { children: ReactNode; tone?: "primary" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...rest}
            className={`text-xs font-semibold transition-colors ${
                tone === "danger" ? "text-red-400 hover:text-red-600" : "text-primary hover:text-secondary"
            }`}
        >
            {children}
        </button>
    );
}

/* ---------------- Row action link ---------------- */

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-secondary transition-colors"
        >
            {children}
            <LuArrowRight className="text-sm" />
        </Link>
    );
}
