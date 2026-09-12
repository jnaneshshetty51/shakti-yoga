"use client";

import Link from "next/link";
import { LuCircleCheck, LuCircleAlert, LuFlower2, LuTarget, LuGraduationCap } from "react-icons/lu";
import { Card, CardHeader, EmptyState } from "@/components/admin/ui";
import { DonutChart } from "@/components/admin/DonutChart";
import { Funnel } from "@/components/admin/Funnel";
import type { Dashboard } from "./lib";

export function AnalyticalGrid({ data }: { data: Dashboard }) {
    const { planMix, trialFunnel, teacherLoad } = data;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* plan mix */}
            <Card>
                <CardHeader title="Plan mix" subtitle="Active subscriptions" />
                <div className="p-5 sm:p-6">
                    {planMix.length > 0 ? (
                        <DonutChart segments={planMix} centerLabel="Members" />
                    ) : (
                        <EmptyState icon={LuFlower2} title="No active subscriptions" />
                    )}
                </div>
            </Card>

            {/* trial funnel */}
            <Card>
                <CardHeader
                    title="Trial funnel"
                    subtitle="Last 30 days"
                    action={<Link href="/admin/leads" className="text-xs font-semibold text-brand hover:text-brand-strong">Leads →</Link>}
                />
                <div className="p-5 sm:p-6">
                    {trialFunnel && trialFunnel.requested > 0 ? (
                        <Funnel
                            stages={[
                                { label: "Requested", value: trialFunnel.requested },
                                { label: "Scheduled", value: trialFunnel.scheduled },
                                { label: "Attended", value: trialFunnel.attended },
                                { label: "Converted", value: trialFunnel.converted },
                            ]}
                            footnote={`${trialFunnel.noShow} no-show${trialFunnel.noShow === 1 ? "" : "s"} · ${trialFunnel.conversionRate}% overall conversion`}
                        />
                    ) : (
                        <EmptyState icon={LuTarget} title="No trial requests yet" />
                    )}
                </div>
            </Card>

            {/* teacher load */}
            <Card>
                <CardHeader
                    title="Teacher load"
                    subtitle="Next 7 days"
                    action={<Link href="/admin/availability" className="text-xs font-semibold text-brand hover:text-brand-strong">Availability →</Link>}
                />
                <div className="p-2">
                    {teacherLoad.length === 0 ? (
                        <EmptyState icon={LuGraduationCap} title="No teachers yet" />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] text-ink-subtle uppercase tracking-wider">
                                    <th className="text-left font-semibold px-3 pb-2">Teacher</th>
                                    <th className="text-right font-semibold px-3 pb-2">Batches</th>
                                    <th className="text-right font-semibold px-3 pb-2">Sessions</th>
                                    <th className="text-right font-semibold px-3 pb-2">Avail.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {teacherLoad.map((t) => (
                                    <tr key={t.id}>
                                        <td className="px-3 py-2 font-medium text-ink truncate max-w-[120px]">{t.name}</td>
                                        <td className="px-3 py-2 text-right text-ink-muted num">{t.batches}</td>
                                        <td className="px-3 py-2 text-right text-ink-muted num">{t.upcomingSessions}</td>
                                        <td className="px-3 py-2 text-right">
                                            {t.hasAvailability
                                                ? <LuCircleCheck className="inline w-4 h-4 text-ok" />
                                                : <LuCircleAlert className="inline w-4 h-4 text-warn" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}
