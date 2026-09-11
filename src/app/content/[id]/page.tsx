import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audienceWhere } from "@/lib/content-audience";
import type { Metadata } from "next";

// Public share-link / Universal-Link-fallback page for a single reel, post or
// announcement. Anonymous only — audienceWhere(null) hides anything targeted
// at a plan tier so a public link can never leak gated content.
export const dynamic = "force-dynamic";

async function getContent(id: string) {
    return prisma.content.findFirst({
        where: { AND: [{ id, status: "PUBLISHED" }, await audienceWhere(null)] },
    });
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    try {
        const content = await getContent(id);
        if (!content) return {};
        const description = content.caption ?? content.body?.slice(0, 155) ?? undefined;
        return {
            title: content.title,
            description,
            alternates: { canonical: `/content/${id}` },
            openGraph: {
                type: "article",
                title: content.title,
                description,
                url: `/content/${id}`,
                ...(content.publishedAt ? { publishedTime: content.publishedAt.toISOString() } : {}),
                ...(content.imageUrl ? { images: [content.imageUrl] } : {}),
                ...(content.videoUrl ? { videos: [content.videoUrl] } : {}),
            },
        };
    } catch {
        return {};
    }
}

const KIND_LABEL: Record<string, string> = { REEL: "Reel", POST: "Post", ANNOUNCEMENT: "Announcement" };

export default async function ContentPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const content = await getContent(id);
    if (!content) notFound();

    const dateLabel = content.publishedAt
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(content.publishedAt)
        : null;

    return (
        <main className="min-h-screen bg-white pt-24 pb-20">
            <article className="max-w-2xl mx-auto px-4">
                <header className="mb-8 text-center">
                    <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                        <span className="text-secondary">{KIND_LABEL[content.type] ?? content.type}</span>
                        {dateLabel && (
                            <>
                                <span>•</span>
                                <span>{dateLabel}</span>
                            </>
                        )}
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-6 leading-tight">
                        {content.title}
                    </h1>
                </header>

                {content.videoUrl ? (
                    <div className="mb-8 rounded-lg overflow-hidden bg-black">
                        <video
                            src={content.videoUrl}
                            poster={content.imageUrl ?? undefined}
                            controls
                            playsInline
                            className="w-full max-h-[70vh] mx-auto"
                        />
                    </div>
                ) : content.imageUrl ? (
                    <div className="mb-8 rounded-lg overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={content.imageUrl} alt={content.title} className="w-full object-cover" />
                    </div>
                ) : null}

                {(content.caption || content.body) && (
                    <div className="prose prose-lg mx-auto mb-8">
                        <p className="whitespace-pre-wrap font-sans text-text/80 leading-relaxed">
                            {content.caption ?? content.body}
                        </p>
                    </div>
                )}

                {content.instagramUrl && (
                    <div className="mb-8 text-center">
                        <a
                            href={content.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-2.5 border-2 border-primary text-primary font-sans text-sm uppercase tracking-widest rounded hover:bg-primary hover:text-white transition-colors font-bold"
                        >
                            View on Instagram
                        </a>
                    </div>
                )}

                <div className="mt-4 pt-8 border-t border-gray-100 text-center">
                    <a
                        href={`shaktiyoga://content/${id}`}
                        className="inline-block px-8 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold shadow-lg mb-4"
                    >
                        Open in the Shakti Yoga app
                    </a>
                    {/* TODO: real App Store / Play Store badges once the app is published */}
                    <p className="text-xs text-gray-400">
                        Don&rsquo;t have the app yet? <Link href="/trial" className="underline hover:text-primary">Start a free trial</Link> to get access.
                    </p>
                </div>
            </article>
        </main>
    );
}
