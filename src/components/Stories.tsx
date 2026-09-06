import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface Testimonial {
    quote: string;
    author: string;
    location: string;
    type: string;
}

// Shown only if no published stories exist in the DB yet.
const FALLBACK: Testimonial[] = [
    {
        quote: "I never thought online yoga could be this effective. My back pain is gone after 3 months of therapy.",
        author: "Priya S.",
        location: "London, UK",
        type: "Yoga Therapy",
    },
    {
        quote: "The everyday classes help me stay grounded despite my hectic work schedule. It's my daily sanctuary.",
        author: "Rahul M.",
        location: "California, USA",
        type: "Everyday Yoga",
    },
    {
        quote: "Authentic, traditional, yet so accessible. The teachers really care about your progress.",
        author: "Sarah J.",
        location: "Dubai, UAE",
        type: "Everyday Yoga",
    },
];

async function getTestimonials(): Promise<Testimonial[]> {
    try {
        const rows = await prisma.story.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { user: { select: { name: true } } },
        });
        if (rows.length === 0) return FALLBACK;
        return rows.map((s) => ({
            quote: s.quote,
            author: s.user?.name ?? s.authorName,
            location: s.location ?? '',
            type: s.planType ?? 'Shakti Yoga',
        }));
    } catch {
        return FALLBACK;
    }
}

export default async function Stories() {
    const testimonials = await getTestimonials();

    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-accent/30">
            <div className="max-w-6xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary text-center mb-10 sm:mb-16">Stories of Transformation</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {testimonials.map((story, index) => (
                        <div key={index} className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-primary/5 flex flex-col">
                            <div className="text-secondary text-3xl sm:text-4xl font-serif mb-2 sm:mb-4">&ldquo;</div>
                            <p className="font-sans text-text/80 italic mb-6 flex-grow text-sm sm:text-base">
                                {story.quote}
                            </p>
                            <div className="mt-auto">
                                <p className="font-serif font-bold text-primary">{story.author}</p>
                                {story.location && (
                                    <p className="font-sans text-xs text-text/60 uppercase tracking-wider">{story.location}</p>
                                )}
                                {story.type && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-accent text-secondary text-[10px] font-bold uppercase tracking-widest rounded">
                                        {story.type}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-10 sm:mt-12">
                    <Link href="/stories" className="inline-block text-primary font-sans font-bold uppercase tracking-widest text-sm hover:text-secondary transition-colors border-b border-primary hover:border-secondary pb-1">
                        View All Stories
                    </Link>
                </div>
            </div>
        </section>
    );
}
