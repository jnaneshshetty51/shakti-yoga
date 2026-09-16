import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { readMinutes } from "@/lib/content";
import { resolveContentCta } from "@/lib/content-cta";
import { publishScheduledContent } from "@/lib/content-schedule";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Metadata } from "next";

// Rendered once then served from cache, refreshed at most every 5 min.
export const revalidate = 300;

export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const posts = await prisma.content.findMany({
            where: { type: "ARTICLE", status: "PUBLISHED", access: "PUBLIC", slug: { not: null } },
            select: { slug: true },
        });
        return posts.map((p) => ({ slug: p.slug as string }));
    } catch {
        // DB unavailable at build — fall back to fully on-demand ISR.
        return [];
    }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await props.params;
    try {
        await publishScheduledContent().catch(() => {});
        const post = await prisma.content.findFirst({ where: { type: "ARTICLE", slug } });
        if (!post || post.status !== "PUBLISHED" || post.access !== "PUBLIC") return {};
        const description = post.metaDescription ?? post.excerpt ?? (post.body ?? "").slice(0, 155);
        return {
            title: post.metaTitle ?? post.title,
            description,
            alternates: { canonical: `/blog/${slug}` },
            openGraph: {
                type: "article",
                title: post.metaTitle ?? post.title,
                description,
                url: `/blog/${slug}`,
                publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
                tags: post.tags.length ? post.tags : undefined,
                ...(post.imageUrl ? { images: [post.imageUrl] } : {}),
            },
        };
    } catch {
        return {};
    }
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    // Safety net if the scheduled-publish cron isn't installed (see
    // CONTENT_PLATFORM_PLAN.md) — must run before the lookup below, or a
    // just-due scheduled post 404s instead of publishing.
    await publishScheduledContent().catch(() => {});
    const post = await prisma.content.findFirst({ where: { type: "ARTICLE", slug: params.slug } });

    if (!post || post.status !== "PUBLISHED" || post.access !== "PUBLIC") {
        notFound();
    }

    const dateLabel = new Intl.DateTimeFormat("en-US", {
        month: "short", day: "numeric", year: "numeric",
    }).format(post.publishedAt ?? post.createdAt);
    const minutes = readMinutes(post.body ?? "");
    const cta = resolveContentCta(post.ctaType, post.ctaLabel, post.relatedContentId);

    const related = await prisma.content.findMany({
        where: {
            type: "ARTICLE", status: "PUBLISHED", access: "PUBLIC",
            category: post.category, id: { not: post.id }, slug: { not: null },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
    });

    return (
        <main className="min-h-screen bg-white pt-24 pb-20">
            <article className="max-w-3xl mx-auto px-4">
                <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

                {/* Header */}
                <header className="mb-12 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                        <span className="text-secondary">{post.category}</span>
                        <span>•</span>
                        <span>{dateLabel}</span>
                        <span>•</span>
                        <span>{minutes} min read</span>
                    </div>
                    <h1 className="font-serif text-4xl md:text-5xl text-gray-900 mb-6 leading-tight">
                        {post.title}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium normal-case tracking-normal">By {post.author}</p>
                    <div className="w-24 h-1 bg-secondary mx-auto rounded-full mt-6"></div>
                </header>

                {post.imageUrl && (
                    <div className="mb-12 rounded-lg overflow-hidden aspect-[16/9] bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Content */}
                <div
                    className="prose prose-lg prose-headings:font-serif prose-headings:text-primary prose-a:text-secondary mx-auto"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body ?? "") }}
                />

                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-10">
                        {post.tags.map((tag) => (
                            <Link
                                key={tag}
                                href={`/blog?tag=${encodeURIComponent(tag)}`}
                                className="px-3 py-1 rounded-full bg-accent/30 text-xs font-semibold text-text/70 hover:bg-accent/50 transition-colors"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Footer / Share */}
                <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-500 mb-6 italic">
                        Did you find this helpful? Share it with a friend.
                    </p>
                    <Link href="/blog" className="text-sm font-bold text-primary uppercase tracking-widest hover:underline">
                        ← Back to Journal
                    </Link>
                </div>
            </article>

            {/* Article-specific CTA, or the generic fallback */}
            <section className="max-w-4xl mx-auto px-4 mt-20">
                <div className="bg-accent/20 rounded-2xl p-10 text-center">
                    {cta ? (
                        <>
                            <h3 className="font-serif text-2xl text-primary mb-4">{cta.heading}</h3>
                            <Link href={cta.href} className="inline-block px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg">
                                {cta.label}
                            </Link>
                        </>
                    ) : (
                        <>
                            <h3 className="font-serif text-2xl text-primary mb-4">Ready to practice?</h3>
                            <p className="text-text/70 mb-8">
                                Experience the benefits of yoga firsthand with our expert teachers.
                            </p>
                            <Link href="/trial" className="px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg">
                                Book a Free Class
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {/* Related articles */}
            {related.length > 0 && (
                <section className="max-w-6xl mx-auto px-4 mt-20">
                    <h3 className="font-serif text-2xl text-primary mb-8 text-center">More from the Journal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {related.map((r) => (
                            <Link key={r.id} href={`/blog/${r.slug}`} className="group">
                                <div className="bg-gray-100 aspect-[4/3] rounded-lg mb-4 overflow-hidden relative">
                                    {r.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.imageUrl} alt={r.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 font-serif text-3xl">
                                            {r.title.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-serif text-lg text-gray-900 group-hover:text-secondary transition-colors leading-snug">{r.title}</h4>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
