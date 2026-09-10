"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Badge, StatusBadge, Button } from "@/components/admin/ui";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { useToast } from "@/components/admin/Toast";

type Data = {
    member: {
        id: string; name: string; email: string; phone: string | null; country: string | null;
        timezone: string; role: string; active: boolean; therapyCredits: number;
        referralCode: string | null; referralCreditBalance: number;
        createdAt: string; lastLogin: string | null; trialStartedAt: string | null;
        goals: string | null; communicationPref: string | null;
    };
    subscription: null | {
        planType: string; planKey: string | null; interval: string; amount: number; currency: string;
        status: string; provider: string; renewalDate: string; startDate: string; pausedAt: string | null; isFamilySeat: boolean;
    };
    sessionBalance: null | { remaining: number; perCycle: number; cycleEnd: string };
    stats: { classesAttended: number; sessionsBooked: number; sessionsCompleted: number };
    payments: { id: string; amount: number; currency: string; status: string; provider: string; planKey: string; at: string }[];
    bookings: { id: string; type: string; status: string; teacher: string; at: string; hasMeetingLink: boolean }[];
    attendance: { id: string; status: string; batch: string; at: string }[];
    creditLedger: { id: string; delta: number; reason: string; note: string | null; at: string }[];
    referrals: { referredBy: { name: string; status: string } | null; invited: { name: string; status: string; reward: number; at: string }[] };
    family: { name: string; email: string; status: string }[];
    certificates: { id: string; title: string; status: string; at: string }[];
    therapyIntake: { status: string; submittedAt: string | null } | null;
    audit: { id: string; action: string; actor: string | null; at: string }[];
};

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (n: number, c = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card padded>
            <h3 className="font-semibold text-ink mb-3 text-sm">{title}</h3>
            {children}
        </Card>
    );
}

export default function MemberDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [data, setData] = useState<Data | null>(null);
    const [credit, setCredit] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/members/${id}`);
        if (res.ok) setData(await res.json());
    }, [id]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const adjustCredits = async (values: EntityValues) => {
        const res = await fetch(`/api/admin/members/${id}/credits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: values.type, delta: Number(values.delta), note: values.note }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
        setCredit(false);
        showToast("success", "Credits adjusted.");
        load();
    };

    const toggleActive = async () => {
        if (!data) return;
        const next = !data.member.active;
        if (!confirm(`${next ? "Reactivate" : "Deactivate"} ${data.member.name}?`)) return;
        const res = await fetch("/api/admin/users", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, active: next }),
        });
        if (!res.ok) return showToast("error", "Failed");
        showToast("success", next ? "Reactivated" : "Deactivated");
        load();
    };

    if (!data) return <PageLoading title="Member" />;
    const m = data.member;

    return (
        <div>
            <Link href="/admin/members" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Members
            </Link>
            <PageHeader title={m.name} subtitle={m.email} eyebrow={<Badge tone="gray">{m.role.replace(/_/g, " ").toLowerCase()}</Badge>}>
                <Button variant="ghost" onClick={() => setCredit(true)}>Adjust credits</Button>
                <Link href="/admin/subscriptions"><Button variant="ghost">Change plan</Button></Link>
                <Button variant={m.active ? "ghost" : "primary"} onClick={toggleActive}>{m.active ? "Deactivate" : "Reactivate"}</Button>
            </PageHeader>

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Profile">
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt><dd>{m.phone || "—"}</dd>
                        <dt className="text-ink-subtle">Country</dt><dd>{m.country || "—"}</dd>
                        <dt className="text-ink-subtle">Timezone</dt><dd>{m.timezone}</dd>
                        <dt className="text-ink-subtle">Member since</dt><dd>{d(m.createdAt)}</dd>
                        <dt className="text-ink-subtle">Last login</dt><dd>{d(m.lastLogin)}</dd>
                        <dt className="text-ink-subtle">Active</dt><dd>{m.active ? "Yes" : "No"}</dd>
                        <dt className="text-ink-subtle">Comms pref</dt><dd>{m.communicationPref || "—"}</dd>
                        <dt className="text-ink-subtle">Referral wallet</dt><dd>{money(m.referralCreditBalance)}</dd>
                    </dl>
                    {m.goals && <p className="text-sm mt-3"><span className="text-ink-subtle">Goals: </span>{m.goals}</p>}
                </Section>

                <Section title="Subscription">
                    {data.subscription ? (
                        <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                            <dt className="text-ink-subtle">Plan</dt><dd className="capitalize">{(data.subscription.planKey || data.subscription.planType).replace(/_/g, " ")}{data.subscription.isFamilySeat ? " (seat)" : ""}</dd>
                            <dt className="text-ink-subtle">Status</dt><dd><StatusBadge status={data.subscription.pausedAt ? "PAUSED" : data.subscription.status} /></dd>
                            <dt className="text-ink-subtle">Amount</dt><dd>{money(data.subscription.amount, data.subscription.currency)} / {data.subscription.interval}</dd>
                            <dt className="text-ink-subtle">Renews</dt><dd>{d(data.subscription.renewalDate)}</dd>
                            <dt className="text-ink-subtle">Via</dt><dd>{data.subscription.provider}</dd>
                            <dt className="text-ink-subtle">Since</dt><dd>{d(data.subscription.startDate)}</dd>
                        </dl>
                    ) : <p className="text-sm text-ink-subtle">No subscription.</p>}
                    <div className="mt-3 flex gap-4 text-sm">
                        <span><b>{data.stats.classesAttended}</b> <span className="text-ink-subtle">classes</span></span>
                        <span><b>{data.stats.sessionsCompleted}</b>/<b>{data.stats.sessionsBooked}</b> <span className="text-ink-subtle">sessions</span></span>
                        <span><b>{m.therapyCredits}</b> <span className="text-ink-subtle">1:1 credits</span></span>
                        {data.sessionBalance && <span><b>{data.sessionBalance.remaining}</b>/<b>{data.sessionBalance.perCycle}</b> <span className="text-ink-subtle">this cycle</span></span>}
                    </div>
                </Section>

                <Section title="Payments">
                    {data.payments.length === 0 ? <p className="text-sm text-ink-subtle">None.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.payments.map((p) => (
                                <li key={p.id} className="flex justify-between py-1.5">
                                    <span>{money(p.amount, p.currency)} <span className="text-ink-subtle">· {p.planKey} · {p.provider}</span></span>
                                    <span className="flex items-center gap-2"><StatusBadge status={p.status} /><span className="text-ink-subtle">{d(p.at)}</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="1:1 sessions">
                    {data.bookings.length === 0 ? <p className="text-sm text-ink-subtle">None.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.bookings.map((b) => (
                                <li key={b.id} className="flex justify-between py-1.5">
                                    <span>{b.type.replace(/_/g, " ").toLowerCase()} <span className="text-ink-subtle">· {b.teacher}</span></span>
                                    <span className="flex items-center gap-2"><StatusBadge status={b.status} /><span className="text-ink-subtle">{d(b.at)}</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Recent attendance">
                    {data.attendance.length === 0 ? <p className="text-sm text-ink-subtle">None.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.attendance.map((a) => (
                                <li key={a.id} className="flex justify-between py-1.5">
                                    <span>{a.batch}</span>
                                    <span className="flex items-center gap-2"><Badge tone={a.status === "PRESENT" ? "green" : a.status === "ABSENT" ? "red" : "gray"}>{a.status}</Badge><span className="text-ink-subtle">{d(a.at)}</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Session-credit ledger">
                    {data.creditLedger.length === 0 ? <p className="text-sm text-ink-subtle">No capped-plan credit history.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.creditLedger.map((e) => (
                                <li key={e.id} className="flex justify-between py-1.5">
                                    <span className={e.delta < 0 ? "text-red-600" : "text-green-700"}>{e.delta > 0 ? "+" : ""}{e.delta} <span className="text-ink-subtle">{e.reason.replace(/_/g, " ").toLowerCase()}{e.note ? ` — ${e.note}` : ""}</span></span>
                                    <span className="text-ink-subtle">{d(e.at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Referrals & family">
                    <p className="text-sm">Code: <span className="font-mono">{m.referralCode || "—"}</span></p>
                    {data.referrals.referredBy && <p className="text-sm mt-1">Referred by <b>{data.referrals.referredBy.name}</b> ({data.referrals.referredBy.status.toLowerCase()})</p>}
                    {data.referrals.invited.length > 0 && (
                        <ul className="text-sm mt-2 divide-y divide-hairline">
                            {data.referrals.invited.map((r, i) => (
                                <li key={i} className="flex justify-between py-1"><span>{r.name}</span><Badge tone="gray">{r.status.toLowerCase()}</Badge></li>
                            ))}
                        </ul>
                    )}
                    {data.family.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs text-ink-subtle uppercase tracking-wide">Family seats</p>
                            {data.family.map((f, i) => <p key={i} className="text-sm">{f.name} <span className="text-ink-subtle">· {f.email}</span></p>)}
                        </div>
                    )}
                </Section>

                <Section title="Certificates & therapy">
                    {data.certificates.length === 0 ? <p className="text-sm text-ink-subtle">No certificates.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.certificates.map((c) => (
                                <li key={c.id} className="flex justify-between py-1"><span>{c.title}</span><StatusBadge status={c.status} /></li>
                            ))}
                        </ul>
                    )}
                    {data.therapyIntake && <p className="text-sm mt-2">Therapy assessment: <Badge tone="gray">{data.therapyIntake.status.replace(/_/g, " ").toLowerCase()}</Badge></p>}
                </Section>

                <Section title="Recent admin actions">
                    {data.audit.length === 0 ? <p className="text-sm text-ink-subtle">None.</p> : (
                        <ul className="text-sm divide-y divide-hairline">
                            {data.audit.map((a) => (
                                <li key={a.id} className="flex justify-between py-1"><span>{a.action}</span><span className="text-ink-subtle">{a.actor} · {d(a.at)}</span></li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            {credit && (
                <EntityFormModal
                    title={`Adjust credits — ${m.name}`}
                    submitLabel="Apply"
                    onCancel={() => setCredit(false)}
                    onSubmit={adjustCredits}
                    fields={[
                        { name: "type", label: "Credit type", type: "select", required: true, options: [
                            { label: "Group-class session credits", value: "session" },
                            { label: "1:1 therapy credits", value: "therapy" },
                        ] },
                        { name: "delta", label: "Change (+ / −)", type: "number", required: true },
                        { name: "note", label: "Reason", type: "text" },
                    ]}
                    initial={{ type: "session" }}
                />
            )}
        </div>
    );
}
