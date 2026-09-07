"use client";

/**
 * Shared app-shell design-system primitives (admin / member / teacher).
 * Built on the tokens in globals.css (:root + [data-app-shell]). Every screen
 * composes these so surfaces, type, spacing and colour stay consistent.
 *
 * Re-exported from `@/components/ui` for non-admin screens.
 */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuArrowRight } from "react-icons/lu";

/* ============================================================ PageHeader */

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-7">
            <div className="min-w-0">
                {eyebrow && <p className="text-sm text-ink-subtle">{eyebrow}</p>}
                <h1 className="text-xl font-semibold text-ink leading-tight tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-ink-muted mt-1 max-w-2xl">{subtitle}</p>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
        </div>
    );
}

/* ============================================================ Toolbar */

/** Page-level toolbar: title on the left, controls on the right, hairline rule. */
export function Toolbar({
    title,
    meta,
    children,
}: {
    title: ReactNode;
    meta?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b border-hairline">
            <div className="flex items-baseline gap-3 min-w-0">
                <h1 className="text-xl font-semibold text-ink tracking-tight">{title}</h1>
                {meta && <span className="text-xs text-ink-subtle num truncate">{meta}</span>}
            </div>
            {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
    );
}

/* ============================================================ Card */

export function Card({
    children,
    className = "",
    padded = false,
    interactive = false,
}: {
    children: ReactNode;
    className?: string;
    padded?: boolean;
    interactive?: boolean;
}) {
    return (
        <div
            className={`bg-surface border border-hairline rounded-card shadow-raised ${
                padded ? "p-5 sm:p-6" : ""
            } ${interactive ? "transition-shadow hover:shadow-overlay" : ""} ${className}`}
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
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-hairline">
            <div className="min-w-0">
                <h3 className="font-semibold text-ink">{title}</h3>
                {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/* ============================================================ Badge */

export type Tone = "green" | "amber" | "red" | "blue" | "purple" | "gray" | "teal";

const TONE: Record<Tone, string> = {
    green: "bg-green-50 text-green-700 ring-green-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
    purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
    teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
    gray: "bg-black/[0.04] text-ink-muted ring-black/10",
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

/* ============================================================ Button */

type ButtonProps = {
    children?: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    shape?: "control" | "pill";
    icon?: IconType;
    loading?: boolean;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-brand text-white hover:bg-brand-strong border-transparent",
    secondary: "bg-surface text-ink-muted hover:bg-surface-hover border-hairline",
    ghost: "bg-transparent text-ink-muted hover:bg-black/[0.04] border-transparent",
    danger: "bg-surface text-red-600 hover:bg-red-50 border-red-200",
};

export function Button({
    children,
    variant = "primary",
    size = "md",
    shape = "control",
    icon: Icon,
    loading = false,
    className = "",
    disabled,
    ...rest
}: ButtonProps) {
    return (
        <button
            {...rest}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-1.5 border font-semibold transition-colors
                disabled:opacity-50 disabled:pointer-events-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface
                ${shape === "pill" ? "rounded-full" : "rounded-control"}
                ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
                ${VARIANT[variant]} ${className}`}
        >
            {loading ? (
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
            ) : (
                Icon && <Icon className="text-[1.1em]" />
            )}
            {children}
        </button>
    );
}

/* ============================================================ SegmentedControl */

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    size = "md",
    "aria-label": ariaLabel,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    size?: "sm" | "md";
    "aria-label"?: string;
}) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className="inline-flex gap-0.5 p-0.5 bg-black/[0.04] rounded-control"
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(o.value)}
                        className={`rounded-[6px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40
                            ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"}
                            ${on ? "bg-surface text-ink shadow-raised" : "text-ink-subtle hover:text-ink-muted"}`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ============================================================ Tabs (legacy pill tabs) */

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
        <div className="inline-flex gap-1 p-1 bg-black/[0.04] rounded-full">
            {tabs.map((t) => {
                const on = t.key === active;
                return (
                    <button
                        key={t.key}
                        onClick={() => onChange(t.key)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            on ? "bg-surface text-ink shadow-raised" : "text-ink-subtle hover:text-ink-muted"
                        }`}
                    >
                        {t.label}
                        {t.count !== undefined && (
                            <span
                                className={`text-xs rounded-full px-1.5 py-0.5 num ${
                                    on ? "bg-brand/10 text-brand" : "bg-black/[0.06] text-ink-subtle"
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

/* ============================================================ Menu (dropdown) */

export function Menu({
    trigger,
    children,
    align = "end",
    className = "",
}: {
    trigger: ReactNode;
    children: ReactNode;
    align?: "start" | "end";
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-full"
            >
                {trigger}
            </button>
            {open && (
                <div
                    role="menu"
                    onClick={() => setOpen(false)}
                    className={`absolute z-50 mt-2 min-w-[200px] rounded-card border border-hairline bg-surface shadow-overlay p-1.5 animate-slide-up ${
                        align === "end" ? "right-0" : "left-0"
                    }`}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export function MenuItem({
    children,
    href,
    onClick,
    icon: Icon,
    tone = "default",
}: {
    children: ReactNode;
    href?: string;
    onClick?: () => void;
    icon?: IconType;
    tone?: "default" | "danger";
}) {
    const cls = `flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] text-sm text-left transition-colors ${
        tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-ink-muted hover:bg-surface-hover hover:text-ink"
    }`;
    const inner = (
        <>
            {Icon && <Icon className="text-base shrink-0" />}
            {children}
        </>
    );
    return href ? (
        <Link href={href} role="menuitem" className={cls}>{inner}</Link>
    ) : (
        <button type="button" role="menuitem" onClick={onClick} className={cls}>{inner}</button>
    );
}

export function MenuLabel({ children }: { children: ReactNode }) {
    return <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{children}</div>;
}

export function MenuSep() {
    return <div className="my-1 h-px bg-hairline" />;
}

/* ============================================================ EmptyState */

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
                <div className="w-12 h-12 rounded-card bg-brand/10 text-brand flex items-center justify-center text-2xl mb-3">
                    <Icon />
                </div>
            )}
            <p className="font-medium text-ink">{title}</p>
            {hint && <p className="text-sm text-ink-muted mt-1 max-w-sm">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/* ============================================================ Loading */

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`skeleton rounded-[10px] ${className}`} />;
}

export function PageLoading({ title }: { title?: string }) {
    return (
        <div>
            {title ? (
                <h1 className="text-xl font-semibold text-ink mb-7">{title}</h1>
            ) : (
                <div className="mb-7 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-72 max-w-full" />
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-card" />
                ))}
            </div>
            <Skeleton className="h-80 rounded-card" />
        </div>
    );
}

/* ============================================================ ErrorState */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <Card padded className="text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-ink-muted mb-4">{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </Card>
    );
}

/* ============================================================ form field styles */

export const inputClass =
    "w-full px-3 py-2 rounded-control border border-hairline text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition";
export const labelClass = "block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1";

/* ============================================================ table row actions */

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
            className={`text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:underline ${
                tone === "danger" ? "text-red-400 hover:text-red-600" : "text-brand hover:text-brand-strong"
            }`}
        >
            {children}
        </button>
    );
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-strong transition-colors"
        >
            {children}
            <LuArrowRight className="text-sm" />
        </Link>
    );
}

/* ============================================================ StaggerItem */

/** Wrap a dashboard section: entrance animation with a per-index delay. */
export function StaggerItem({
    index = 0,
    className = "",
    children,
}: {
    index?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`animate-card-in ${className}`} style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
            {children}
        </div>
    );
}

