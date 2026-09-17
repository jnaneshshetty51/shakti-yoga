import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { readMinutes, CATEGORY_LABEL } from "@/lib/content";
import { publishScheduledContent } from "@/lib/content-schedule";
import type { ContentCategory } from "@prisma/client";

export const revalidate = 300;

export const metadata: Metadata = {
    title: "The Shakti Journal",
    description: "Articles on yoga, mindfulness, therapeutic practice and finding balance in a busy life.",
    alternates: { canonical: "/blog" },
};

function formatDate(d: Date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function hrefFor(category?: string, tag?: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return qs ? `/blog?${qs}` : "/blog";
}

export default async function BlogPage(props: { searchParams: Promise<{ category?: string; tag?: string }> }) {
    const { category, tag } = await props.searchParams;
    const activeCategory = category && category.toUpperCase() in CATEGORY_LABEL ? (category.toUpperCase() as ContentCategory) : null;

    let posts: Awaited<ReturnType<typeof prisma.content.findMany>> = [];
    let categoriesWithPosts: string[] = [];
    try {
        // Safety net if the scheduled-publish cron isn't installed (see
        // CONTENT_PLATFORM_PLAN.md) — this page only revalidates every 5 min,
        // so the cost of checking here is negligible.
        await publishScheduledContent().catch(() => {});
        [posts, categoriesWithPosts] = await Promise.all([
            prisma.content.findMany({
                where: {
                    type: "ARTICLE", status: "PUBLISHED", access: "PUBLIC",
                    ...(activeCategory ? { category: activeCategory } : {}),
                    ...(tag ? { tags: { has: tag } } : {}),
                },
                orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            }),
            prisma.content
                .findMany({ where: { type: "ARTICLE", status: "PUBLISHED", access: "PUBLIC" }, select: { category: true }, distinct: ["category"] })
                .then((rows) => rows.map((r) => r.category)),
        ]);
    } catch {
        // DB unavailable at build/revalidate — render the empty state; ISR retries.
    }

    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="bg-secondary/10 py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="text-secondary font-bold uppercase tracking-widest text-sm mb-4 block">The Shakti Journal</span>
                    <h1 className="font-serif text-4xl md:text-5xl text-primary mb-6">Wisdom for Modern Life</h1>
                    <p className="text-lg text-text/70 max-w-2xl mx-auto">
                        Explore articles on yoga, mindfulness, health, and finding balance in a busy world.
                    </p>
                </div>
            </section>

            {categoriesWithPosts.length > 1 && (
                <div className="max-w-6xl mx-auto px-4 pt-12 flex flex-wrap justify-center gap-2">
                    <Link
                        href="/blog"
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${!activeCategory ? "bg-secondary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        All
                    </Link>
                    {categoriesWithPosts.map((c) => (
                        <Link
                            key={c}
                            href={hrefFor(c)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${activeCategory === c ? "bg-secondary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            {CATEGORY_LABEL[c as ContentCategory] ?? c}
                        </Link>
                    ))}
                </div>
            )}

            {tag && (
                <div className="max-w-6xl mx-auto px-4 pt-6 text-center text-sm text-text/60">
                    Tagged <span className="font-semibold text-text">#{tag}</span> · <Link href={hrefFor(category)} className="underline hover:text-secondary">clear</Link>
                </div>
            )}

            {/* Blog Grid */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {posts.length === 0 && (
                        <p className="text-text/60 italic col-span-full text-center">No articles found.</p>
                    )}
                    {posts.map((post) => (
                        <article key={post.id} className="group cursor-pointer">
                            <Link href={`/blog/${post.slug ?? post.id}`}>
                                <div className="bg-gray-100 aspect-[4/3] rounded-lg mb-6 overflow-hidden relative">
                                    {post.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.imageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 font-serif text-4xl group-hover:scale-105 transition-transform duration-500">
                                            {post.title.charAt(0)}
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold uppercase tracking-widest text-secondary">
                                        {CATEGORY_LABEL[post.category] ?? post.category}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center justify-between flex-wrap gap-1">
                                        <span>{formatDate(post.publishedAt ?? post.createdAt)} · {readMinutes(post.body ?? "")} min read</span>
                                        {post.author && post.author !== "Shakti Yoga" && (
                                            <span className="text-secondary font-semibold normal-case">By {post.author}</span>
                                        )}
                                    </div>
                                    <h2 className="font-serif text-2xl text-gray-800 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-text/70 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="pt-2 flex items-center justify-between">
                                        <div className="text-secondary font-bold uppercase tracking-widest text-xs group-hover:underline">
                                            Read Article →
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="bg-primary text-white py-20 px-4">
                <div className="max-w-xl mx-auto text-center">
                    <h2 className="font-serif text-3xl mb-4">Join the Community</h2>
                    <p className="text-white/80 mb-8">
                        Practice with our teachers and get class updates and daily inspiration in your batch&apos;s WhatsApp group.
                    </p>
                    <Link
                        href="/trial"
                        className="inline-block px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-white hover:text-secondary transition-colors"
                    >
                        Book a Free Class
                    </Link>
                </div>
            </section>
        </main>
    );
}
