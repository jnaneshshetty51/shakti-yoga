"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import { Toolbar, SegmentedControl, ErrorState, Skeleton, StaggerItem } from "@/components/admin/ui";
import type { Dashboard, RangeKey } from "./_dashboard/lib";
import { RANGE_OPTIONS, timeAgo } from "./_dashboard/lib";
import { KpiBand } from "./_dashboard/KpiBand";
import { AttentionStrip } from "./_dashboard/AttentionStrip";
import { TrendPanel } from "./_dashboard/TrendPanel";
import { AnalyticalGrid } from "./_dashboard/AnalyticalGrid";
import { OperationsRail } from "./_dashboard/OperationsRail";

const RANGE_LABEL: Record<RangeKey, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

function DashboardSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-hairline">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-card" />)}
            </div>
            <Skeleton className="h-16 rounded-card" />
            <Skeleton className="h-80 rounded-card" />
            <div className="grid lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-card" />)}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-card" />)}
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState<RangeKey>("30d");
    const [, forceTick] = useState(0);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async (r: RangeKey, mode: "initial" | "refresh") => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        if (mode === "refresh") setRefreshing(true);
        try {
            const res = await fetch(`/api/admin/dashboard?range=${r}`, { signal: ac.signal, cache: "no-store" });
            if (res.status === 401 || res.status === 403) {
                setError("Your session has expired. Please sign in again.");
                return;
            }
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            setData((await res.json()) as Dashboard);
            setError(null);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            console.error("Dashboard load failed:", e);
            setError("Could not load the dashboard. Check your connection and retry.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load(range, data ? "refresh" : "initial");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, load]);

    useEffect(() => {
        const poll = setInterval(() => load(range, "refresh"), 60_000);
        const onFocus = () => load(range, "refresh");
        const clock = setInterval(() => forceTick((n) => n + 1), 30_000);
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(poll);
            clearInterval(clock);
            window.removeEventListener("focus", onFocus);
            abortRef.current?.abort();
        };
    }, [range, load]);

    if (error && !data) {
        return (
            <div>
                <h1 className="text-xl font-semibold text-ink mb-6">Dashboard</h1>
                <ErrorState message={error} onRetry={() => { setLoading(true); load(range, "initial"); }} />
            </div>
        );
    }

    if (loading && !data) return <DashboardSkeleton />;
    if (!data) return null;

    return (
        <div>
            <Toolbar title="Dashboard" meta={`Updated ${timeAgo(data.generatedAt)}`}>
                <SegmentedControl
                    aria-label="Time range"
                    size="sm"
                    value={range}
                    onChange={setRange}
                    options={RANGE_OPTIONS}
                />
                <button
                    onClick={() => load(range, "refresh")}
                    disabled={refreshing}
                    aria-label="Refresh"
                    title={`Updated ${timeAgo(data.generatedAt)}`}
                    className="p-2 rounded-control border border-hairline bg-surface text-ink-muted hover:bg-surface-hover disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                    <LuRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
            </Toolbar>

            {data.partial && (
                <div className="mb-4 px-4 py-2.5 rounded-control bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    Some sections could not be loaded and may be incomplete. They will retry automatically.
                </div>
            )}

            <div className="space-y-4">
                <StaggerItem index={0}><KpiBand data={data} /></StaggerItem>
                <StaggerItem index={1}><AttentionStrip data={data} /></StaggerItem>
                <StaggerItem index={2}><TrendPanel data={data} rangeLabel={RANGE_LABEL[range]} /></StaggerItem>
                <StaggerItem index={3}><AnalyticalGrid data={data} /></StaggerItem>
                <StaggerItem index={4}><OperationsRail data={data} /></StaggerItem>
            </div>
        </div>
    );
}
