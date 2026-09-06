"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface StoryRow {
    id: string;
    name: string;
    location: string;
    plan: string;
    quote: string;
    content: string;
    rating: number;
    imageUrl: string | null;
}

export default function StoriesPage() {
    const [filter, setFilter] = useState<string>("All");
    const [stories, setStories] = useState<StoryRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/stories")
            .then(r => r.json())
            .then(d => setStories(d.stories || []))
            .catch(() => setStories([]))
            .finally(() => setLoading(false));
    }, []);

    const filteredStories = useMemo(() => {
        if (filter === "All") return stories;
        return stories.filter(story => {
            const p = story.plan.toLowerCase();
            if (filter === "NRI") return p.includes("nri");
            if (filter === "Therapy") return p.includes("therapy");
            if (filter === "Everyday Yoga") return p.includes("everyday");
            return true;
        });
    }, [stories, filter]);

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="bg-primary text-white py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="font-serif text-4xl md:text-5xl mb-6">Stories of Transformation</h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                        Real stories from our community members who have found healing, balance, and strength through Shakti Yoga.
                    </p>
                </div>
            </section>

            {/* Filter Section */}
            <section className="py-12 px-4 sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4">
                    {["All", "Everyday Yoga", "Therapy", "NRI"].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${filter === cat
                                ? "bg-secondary text-white shadow-md transform scale-105"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-secondary hover:text-secondary"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            {/* Stories Grid */}
            <section className="py-12 px-4 pb-24">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="text-center py-20 text-gray-500">Loading stories...</div>
                    ) : filteredStories.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No stories found for this category.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredStories.map((story) => (
                                <div key={story.id} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex justify-between items-start mb-6 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-accent/30 overflow-hidden shrink-0 flex items-center justify-center text-secondary font-serif text-lg">
                                                {story.imageUrl
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    ? <img src={story.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    : story.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-serif text-xl text-gray-800 truncate">{story.name}</h3>
                                                <p className="text-xs text-gray-500 uppercase tracking-widest truncate">{story.location}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-accent/20 text-secondary text-[10px] font-bold uppercase tracking-widest rounded shrink-0">
                                            {story.plan}
                                        </span>
                                    </div>

                                    <div className="mb-6 flex-grow">
                                        <div className="text-secondary text-4xl font-serif leading-none mb-2">“</div>
                                        <p className="text-gray-700 italic relative z-10 pl-4">
                                            {story.quote}
                                        </p>
                                    </div>

                                    {story.content && (
                                        <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 mb-6 border-l-2 border-primary/30">
                                            <p>{story.content}</p>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={`text-lg ${i < story.rating ? "text-yellow-400" : "text-gray-200"}`}>
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-accent/20 py-20 px-4 text-center">
                <h2 className="font-serif text-3xl text-primary mb-6">Start Your Own Journey</h2>
                <p className="text-text/70 mb-8 max-w-xl mx-auto">
                    Whether you're looking for daily balance or specialized healing, we have a path for you.
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/trial" className="px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg">
                        Start Free Trial
                    </Link>
                    <Link href="/yoga-therapy/start" className="px-8 py-3 border border-secondary text-secondary font-bold uppercase tracking-widest rounded hover:bg-secondary/10 transition-colors">
                        Explore Therapy
                    </Link>
                </div>
            </section>
        </main>
    );
}
