import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { readMinutes } from "@/lib/content";
import { resolveContentCta } from "@/lib/content-cta";
import { publishScheduledContent } from "@/lib/content-schedule";
import Breadcrumbs from "@/components/Breadcrumbs";
import ShareButtons from "@/components/blog/ShareButtons";
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
    const post = await prisma.content.findFirst({
        where: { type: "ARTICLE", slug: params.slug },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                    role: true,
                    staffProfile: {
                        select: {
                            title: true,
                            bio: true,
                            specialties: true,
                        },
                    },
                },
            },
        },
    });

    if (!post || post.status !== "PUBLISHED" || post.access !== "PUBLIC") {
        notFound();
    }

    // Resolve author profile (either via createdBy or matching trainer name)
    let authorUser = post.createdBy;
    let authorProfile = authorUser?.staffProfile;
    if (!authorProfile && post.author && post.author !== "Shakti Yoga") {
        try {
            const matchingTeacher = await prisma.user.findFirst({
                where: {
                    name: { equals: post.author, mode: "insensitive" },
                    role: { in: ["TEACHER", "STAFF_ADMIN", "SUPER_ADMIN"] },
                },
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                    role: true,
                    staffProfile: {
                        select: {
                            title: true,
                            bio: true,
                            specialties: true,
                        },
                    },
                },
            });
            if (matchingTeacher) {
                authorUser = matchingTeacher;
                authorProfile = matchingTeacher.staffProfile;
            }
        } catch {
            // Safe fallback
        }
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
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <div className="flex items-center gap-2">
                            {authorUser?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={authorUser.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                    {post.author.charAt(0)}
                                </div>
                            )}
                            <p className="text-sm text-gray-600 font-medium normal-case tracking-normal">
                                By <span className="text-gray-900 font-semibold">{post.author}</span>
                                {authorProfile?.title ? ` · ${authorProfile.title}` : ""}
                            </p>
                        </div>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <ShareButtons title={post.title} url={`/blog/${params.slug}`} variant="compact" />
                    </div>
                    <ShareButtons title={post.title} url={`/blog/${params.slug}`} variant="floating" />
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

                {/* Author Bio Card for Trainers / Staff */}
                {(authorProfile || (authorUser && authorUser.role === "TEACHER")) && (
                    <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-[#FBFAF7] border border-gray-200/70 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                            {authorUser?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={authorUser.avatarUrl} alt={post.author} className="w-full h-full object-cover" />
                            ) : (
                                post.author.charAt(0)
                            )}
                        </div>
                        <div className="text-center sm:text-left flex-1">
                            <div className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">Written by Trainer</div>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mb-1">{post.author}</h3>
                            {authorProfile?.title && (
                                <div className="text-xs font-semibold text-primary mb-2.5">{authorProfile.title}</div>
                            )}
                            {authorProfile?.bio && (
                                <p className="text-sm text-text/80 leading-relaxed mb-3">{authorProfile.bio}</p>
                            )}
                            {authorProfile?.specialties && authorProfile.specialties.length > 0 && (
                                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-1">
                                    {authorProfile.specialties.map((spec) => (
                                        <span key={spec} className="px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-text/70">
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Share Card */}
                <div className="mt-12">
                    <ShareButtons title={post.title} url={`/blog/${params.slug}`} variant="card" />
                </div>

                {/* Back Link */}
                <div className="mt-10 text-center">
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
