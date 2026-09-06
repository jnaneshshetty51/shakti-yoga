import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

// Rendered once then served from cache, refreshed at most every 5 min.
export const revalidate = 300;

export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const posts = await prisma.blogPost.findMany({
            where: { status: "PUBLISHED" },
            select: { slug: true },
        });
        return posts.map((p) => ({ slug: p.slug }));
    } catch {
        // DB unavailable at build — fall back to fully on-demand ISR.
        return [];
    }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await props.params;
    try {
        const post = await prisma.blogPost.findUnique({ where: { slug } });
        if (!post || post.status !== "PUBLISHED") return {};
        const description = post.metaDescription ?? post.excerpt ?? post.content.slice(0, 155);
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
                ...(post.imageUrl || post.featuredImage ? { images: [(post.imageUrl ?? post.featuredImage) as string] } : {}),
            },
        };
    } catch {
        return {};
    }
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const post = await prisma.blogPost.findUnique({ where: { slug: params.slug } });

    if (!post || post.status !== "PUBLISHED") {
        notFound();
    }

    const dateLabel = new Intl.DateTimeFormat("en-US", {
        month: "short", day: "numeric", year: "numeric",
    }).format(post.publishedAt ?? post.createdAt);

    return (
        <main className="min-h-screen bg-white pt-24 pb-20">
            <article className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <header className="mb-12 text-center">
                    <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                        <span className="text-secondary">{post.category}</span>
                        <span>•</span>
                        <span>{dateLabel}</span>
                    </div>
                    <h1 className="font-serif text-4xl md:text-5xl text-gray-900 mb-8 leading-tight">
                        {post.title}
                    </h1>
                    <div className="w-24 h-1 bg-secondary mx-auto rounded-full"></div>
                </header>

                {/* Content */}
                <div className="prose prose-lg prose-headings:font-serif prose-headings:text-primary prose-a:text-secondary mx-auto">
                    {/* 
                In a real app, we'd use a proper markdown renderer. 
                For now, we'll just render the text with simple whitespace handling 
                or use a basic replacement since we don't have 'react-markdown' installed yet.
                Let's just display it as pre-wrap for simplicity in this prototype 
                or do a simple split.
            */}
                    <div className="whitespace-pre-wrap font-sans text-text/80 leading-relaxed">
                        {post.content}
                    </div>
                </div>

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

            {/* Related / CTA */}
            <section className="max-w-4xl mx-auto px-4 mt-20">
                <div className="bg-accent/20 rounded-2xl p-10 text-center">
                    <h3 className="font-serif text-2xl text-primary mb-4">Ready to practice?</h3>
                    <p className="text-text/70 mb-8">
                        Experience the benefits of yoga firsthand with our expert teachers.
                    </p>
                    <Link href="/trial" className="px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg">
                        Book a Free Class
                    </Link>
                </div>
            </section>
        </main>
    );
}
