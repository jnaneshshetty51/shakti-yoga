import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import EnquiryForm from "./EnquiryForm";
import type { Metadata } from "next";

// Rendered once then served from cache, refreshed at most every 5 min —
// matches the blog post page's revalidation window.
export const revalidate = 300;

const KIND_LABEL: Record<string, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };

async function getRetreat(id: string) {
    const retreat = await prisma.retreat.findUnique({ where: { id } });
    if (!retreat || retreat.status !== "PUBLISHED") return null;
    return retreat;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    const retreat = await getRetreat(id);
    if (!retreat) return {};
    const description = retreat.description?.slice(0, 155) ?? `${KIND_LABEL[retreat.kind]} at Shakti Yoga Kendra${retreat.location ? ` — ${retreat.location}` : ""}.`;
    return {
        title: retreat.name,
        description,
        alternates: { canonical: `/retreats/${id}` },
        openGraph: {
            type: "website",
            title: retreat.name,
            description,
            url: `/retreats/${id}`,
            ...(retreat.images[0] ? { images: [retreat.images[0]] } : {}),
        },
    };
}

export default async function RetreatDetailPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const retreat = await getRetreat(id);
    if (!retreat) notFound();

    return (
        <div className="max-w-2xl mx-auto px-4 py-16">
            <Breadcrumbs items={[{ label: "Retreats & Events", href: "/retreats" }, { label: retreat.name }]} />

            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{KIND_LABEL[retreat.kind]}</span>
            <h1 className="font-serif text-3xl text-gray-800 mt-1 mb-2">{retreat.name}</h1>
            <p className="text-gray-500 mb-1">
                {new Date(retreat.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" – "}
                {new Date(retreat.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {retreat.location && <p className="text-gray-500 mb-4">{retreat.location}</p>}
            {retreat.description && <p className="text-gray-600 mb-8 whitespace-pre-line">{retreat.description}</p>}

            <EnquiryForm retreatId={retreat.id} />
        </div>
    );
}
