"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { PageHeader, PageLoading, Card, Button, StatusBadge } from "@/components/admin/ui";
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
    const [e, setE] = useState<Enquiry | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/retreats/enquiries/${id}`);
        if (res.ok) setE((await res.json()).enquiry);
    }, [id]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const setStatus = async (status: string) => {
        const res = await fetch(`/api/admin/retreats/enquiries/${id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) return showToast("error", "Failed");
        showToast("success", `Marked ${status.toLowerCase()}`);
        load();
    };

    const del = async () => {
        if (!confirm("Delete this enquiry?")) return;
        await fetch(`/api/admin/retreats/enquiries/${id}`, { method: "DELETE" });
        router.push("/admin/retreats");
    };

    if (!e) return <PageLoading title="Enquiry" />;

    return (
        <div>
            <Link href="/admin/retreats" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Retreats
            </Link>
            <PageHeader title={e.name} subtitle={e.email} eyebrow={<StatusBadge status={e.status} />}>
                {STATUSES.map((sName) => (
                    <Button key={sName} size="sm" variant={e.status === sName ? "primary" : "ghost"} onClick={() => setStatus(sName)}>
                        {sName[0] + sName.slice(1).toLowerCase()}
                    </Button>
                ))}
            </PageHeader>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">Enquiry</h3>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                        <dt className="text-ink-subtle">Phone</dt><dd>{e.phone || "—"}</dd>
                        <dt className="text-ink-subtle">Participants</dt><dd>{e.participantsCount}</dd>
                        <dt className="text-ink-subtle">Received</dt><dd>{d(e.createdAt)}</dd>
                    </dl>
                    {e.message && <p className="text-sm mt-3"><span className="text-ink-subtle">Message: </span>{e.message}</p>}
                    <div className="mt-4 flex gap-2">
                        <Link href="/admin/payments"><Button size="sm" variant="ghost">Record a payment</Button></Link>
                        <Button size="sm" variant="ghost" onClick={del}>Delete enquiry</Button>
                    </div>
                </Card>

                <Card padded>
                    <h3 className="font-semibold text-ink mb-3 text-sm">{e.retreat.kind[0] + e.retreat.kind.slice(1).toLowerCase()}</h3>
                    <p className="font-medium">{e.retreat.name}</p>
                    <dl className="text-sm grid grid-cols-2 gap-y-1.5 mt-2">
                        <dt className="text-ink-subtle">Location</dt><dd>{e.retreat.location || "—"}</dd>
                        <dt className="text-ink-subtle">Dates</dt><dd>{d(e.retreat.startDate)} – {d(e.retreat.endDate)}</dd>
                        <dt className="text-ink-subtle">Price</dt><dd>{e.retreat.price != null ? `${e.retreat.currency} ${e.retreat.price}` : "—"}</dd>
                    </dl>
                </Card>
            </div>
        </div>
    );
}
