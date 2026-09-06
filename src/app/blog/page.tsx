import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

function formatDate(d: Date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export default async function BlogPage() {
    let posts: Awaited<ReturnType<typeof prisma.blogPost.findMany>> = [];
    try {
        posts = await prisma.blogPost.findMany({
            where: { status: "PUBLISHED" },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        });
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

            {/* Blog Grid */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {posts.length === 0 && (
                        <p className="text-text/60 italic col-span-full text-center">No articles published yet.</p>
                    )}
                    {posts.map((post) => (
                        <article key={post.slug} className="group cursor-pointer">
                            <Link href={`/blog/${post.slug}`}>
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
                                        {post.category}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest">{formatDate(post.publishedAt ?? post.createdAt)}</div>
                                    <h2 className="font-serif text-2xl text-gray-800 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-text/70 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="pt-2 text-secondary font-bold uppercase tracking-widest text-xs group-hover:underline">
                                        Read Article →
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
