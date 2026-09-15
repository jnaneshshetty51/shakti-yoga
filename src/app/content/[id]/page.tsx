import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessContent } from "@/lib/content-audience";
import { CONTENT_TYPE_LABEL, isFeedType } from "@/lib/content";
import ReelPlayer from "@/components/ReelPlayer";
import type { Metadata } from "next";

// Public share-link / Universal-Link-fallback page for a single piece of
// content. Anonymous only. Gated content never leaks its media/body here —
// it renders the free-preview + "Continue in the Shakti app" / "Join Shakti"
// acquisition card instead (see spec: free preview for premium content).
export const dynamic = "force-dynamic";

async function getContent(id: string) {
    const row = await prisma.content.findFirst({ where: { id, status: "PUBLISHED" } });
    return row && isFeedType(row.type) ? row : null;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    try {
        const content = await getContent(id);
        if (!content) return {};
        const description = content.excerpt ?? content.caption ?? content.body?.slice(0, 155) ?? undefined;
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

export default async function ContentPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const content = await getContent(id);
    if (!content) notFound();

    const dateLabel = content.publishedAt
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(content.publishedAt)
        : null;

    const unlocked = await canAccessContent(null, content);
    const isReelOrVideo = content.type === "VIDEO" || Boolean(content.videoUrl) || Boolean(content.instagramUrl);

    if (!unlocked) {
        return (
            <main className="min-h-screen bg-white pt-24 pb-20">
                <article className="max-w-2xl mx-auto px-4 text-center">
                    {content.imageUrl && (
                        <div className="mb-8 rounded-lg overflow-hidden bg-gray-100 aspect-[16/9]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={content.imageUrl} alt={content.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <span className="text-xs font-bold uppercase tracking-widest text-secondary">{CONTENT_TYPE_LABEL[content.type]}</span>
                    <h1 className="font-serif text-3xl md:text-4xl text-gray-900 my-4 leading-tight">{content.title}</h1>
                    {(content.excerpt || content.caption) && (
                        <p className="text-text/70 leading-relaxed mb-8">{content.excerpt ?? content.caption}</p>
                    )}
                    <div className="border-t border-gray-100 pt-8">
                        <a
                            href={`shaktiyoga://content/${id}`}
                            className="inline-block px-8 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold shadow-lg mb-4"
                        >
                            Continue in the Shakti app
                        </a>
                        <p className="text-xs text-gray-400">
                            New here? <Link href="/trial" className="underline hover:text-primary font-semibold">Join Shakti</Link> to get full access.
                        </p>
                    </div>
                </article>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white pt-24 pb-20">
            <article className="max-w-2xl mx-auto px-4">
                <header className="mb-8 text-center">
                    <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                        <span className="text-secondary">{CONTENT_TYPE_LABEL[content.type]}</span>
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

                {isReelOrVideo ? (
                    <ReelPlayer
                        title={content.title}
                        caption={content.caption ?? content.body}
                        videoUrl={content.videoUrl}
                        imageUrl={content.imageUrl}
                        instagramUrl={content.instagramUrl}
                        author={content.author}
                        tags={content.tags}
                    />
                ) : content.audioUrl ? (
                    <div className="mb-8">
                        <audio src={content.audioUrl} controls className="w-full" />
                    </div>
                ) : content.imageUrl ? (
                    <div className="mb-8 rounded-lg overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={content.imageUrl} alt={content.title} className="w-full object-cover" />
                    </div>
                ) : null}

                {/* Extended description / cues for articles and practices */}
                {!isReelOrVideo && (content.caption || content.body) && (
                    <div className="prose prose-lg mx-auto mb-8">
                        <p className="whitespace-pre-wrap font-sans text-text/80 leading-relaxed">
                            {content.caption ?? content.body}
                        </p>
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
