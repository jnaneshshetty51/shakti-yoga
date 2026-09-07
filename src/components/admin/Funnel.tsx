"use client";

export type FunnelStage = { label: string; value: number };

interface FunnelProps {
    stages: FunnelStage[];
    /** e.g. "3 no-shows · 24% overall conversion" */
    footnote?: string;
    className?: string;
}

/**
 * Vertical funnel — one hue, width carries the magnitude (stages of one
 * process, not distinct series). Each row shows its count and the step
 * conversion from the previous stage.
 */
export function Funnel({ stages, footnote, className = "" }: FunnelProps) {
    const first = stages[0]?.value || 1;

    return (
        <div className={className}>
            <div className="space-y-2.5">
                {stages.map((s, i) => {
                    const w = Math.max(3, (s.value / first) * 100);
                    const stepPct = i === 0 || !stages[i - 1].value
                        ? null
                        : Math.round((s.value / stages[i - 1].value) * 100);
                    return (
                        <div key={s.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-ink-muted">{s.label}</span>
                                <span className="text-ink font-semibold num">{s.value.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="h-6 rounded-[6px] bg-surface-hover overflow-hidden">
                                <div
                                    className="h-full rounded-[6px]"
                                    style={{ width: `${w}%`, background: "var(--chart-ink)" }}
                                    title={`${s.label}: ${s.value}`}
                                />
                            </div>
                            {stepPct !== null && (
                                <div className="text-[11px] text-ink-subtle mt-1 num">↳ {stepPct}% from previous</div>
                            )}
                        </div>
                    );
                })}
            </div>
            {footnote && <p className="text-xs text-ink-subtle mt-3">{footnote}</p>}
        </div>
    );
}
