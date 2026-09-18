"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LuArrowLeft, LuMessageCircle, LuCalendar, LuCreditCard } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Button, StatusBadge, ErrorState, useConfirmDialog, Badge } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Enquiry = {
    id: string; name: string; email: string; phone: string | null; message: string | null;
    participantsCount: number; status: string; createdAt: string;
    retreat: { id: string; name: string; kind: string; location: string | null; startDate: string; endDate: string; price: number | null; currency: string };
};

const STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "PAID", "CANCELLED"];
const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function EnquiryDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [e, setE] = useState<Enquiry | null>(null);
    const [loadError, setLoadError] = useState(false);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/admin/retreats/enquiries/${id}`);
            if (res.ok) {
                setE((await res.json()).enquiry);
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (status: string) => {
        const res = await fetch(`/api/admin/retreats/enquiries/${id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) return showToast("error", "Failed to update status");
        showToast("success", `Marked as ${status.toLowerCase()}`);
        load();
    };

    const del = async () => {
        const ok = await confirm({
            title: "Delete this enquiry?",
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/retreats/enquiries/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Could not delete enquiry.");
            return;
        }
        showToast("success", "Enquiry deleted.");
        router.push("/admin/crm?tab=retreats");
    };

    if (loadError) {
        return (
            <div>
                <Link href="/admin/crm?tab=retreats" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                    <LuArrowLeft /> Back to Retreats & Events
                </Link>
                <ErrorState message="Could not load this enquiry." onRetry={load} />
            </div>
        );
    }

    if (!e) return <PageLoading title="Enquiry" />;

    const totalEstimate = e.retreat.price != null ? e.retreat.price * (e.participantsCount || 1) : null;

    return (
        <div>
            {dialog}
            <Link href="/admin/crm?tab=retreats" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Back to Retreats & Events
            </Link>
            <PageHeader
                title={e.name}
                subtitle={e.email}
                eyebrow={
                    <div className="flex items-center gap-2">
                        <StatusBadge status={e.status} />
                        <Badge tone="purple">{e.retreat.kind}</Badge>
                    </div>
                }
            >
                {STATUSES.map((sName) => (
                    <Button key={sName} size="sm" variant={e.status === sName ? "primary" : "ghost"} onClick={() => setStatus(sName)}>
                        {sName[0] + sName.slice(1).toLowerCase()}
                    </Button>
                ))}
            </PageHeader>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Guest & Enquiry Details</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-2">
                        <dt className="text-ink-subtle">Phone</dt>
                        <dd>
                            {e.phone ? (
                                <div className="flex items-center gap-2">
                                    <span>{e.phone}</span>
                                    <a
                                        href={`https://wa.me/${e.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${e.name}, thank you for your enquiry regarding ${e.retreat.name} at Shakthi Yoga!`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                                        title="Chat on WhatsApp"
                                    >
                                        <LuMessageCircle className="w-3.5 h-3.5" />
                                        WhatsApp
                                    </a>
                                </div>
                            ) : (
                                "—"
                            )}
                        </dd>
                        <dt className="text-ink-subtle">Participants</dt><dd className="font-medium text-ink">{e.participantsCount} {e.participantsCount > 1 ? "guests" : "guest"}</dd>
                        <dt className="text-ink-subtle">Received</dt><dd>{d(e.createdAt)}</dd>
                        {totalEstimate != null && (
                            <>
                                <dt className="text-ink-subtle">Estimated Value</dt>
                                <dd className="font-semibold text-brand">
                                    {e.retreat.currency} {totalEstimate.toLocaleString("en-IN")}
                                </dd>
                            </>
                        )}
                    </dl>
                    {e.message && (
                        <div className="mt-4 pt-3 border-t border-hairline">
                            <span className="text-xs uppercase font-medium text-ink-subtle block mb-1">Message from guest:</span>
                            <p className="text-sm text-ink bg-surface-raised p-3 rounded-control border border-hairline">{e.message}</p>
                        </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2 pt-3 border-t border-hairline">
                        <Link href={`/admin/finance?tab=payments&description=${encodeURIComponent(`${e.retreat.name} - ${e.name}`)}`}>
                            <Button size="sm" variant="primary">
                                <LuCreditCard className="w-3.5 h-3.5 mr-1" />
                                Record a payment
                            </Button>
                        </Link>
                        <Button size="sm" variant="danger" onClick={del}>Delete enquiry</Button>
                    </div>
                </Card>

                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm flex items-center justify-between">
                        <span>Event Details</span>
                        <span className="text-xs text-brand font-medium">#{e.retreat.id.slice(0, 8)}</span>
                    </h3>
                    <p className="font-serif text-lg text-ink font-semibold">{e.retreat.name}</p>
                    <dl className="text-sm grid grid-cols-2 gap-y-2 mt-3">
                        <dt className="text-ink-subtle">Location</dt><dd>{e.retreat.location || "Online / Shakthi Studio"}</dd>
                        <dt className="text-ink-subtle">Event Dates</dt><dd>{d(e.retreat.startDate)} – {d(e.retreat.endDate)}</dd>
                        <dt className="text-ink-subtle">Price per guest</dt><dd className="font-medium">{e.retreat.price != null ? `${e.retreat.currency} ${e.retreat.price.toLocaleString("en-IN")}` : "Complimentary"}</dd>
                    </dl>
                </Card>
            </div>
        </div>
    );
}
