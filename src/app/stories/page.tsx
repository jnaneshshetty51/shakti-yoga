"use client";

import { useState } from "react";
import { stories, Story } from "@/utils/content";
import Link from "next/link";

export default function StoriesPage() {
    const [filter, setFilter] = useState<string>("All");

    const filteredStories = filter === "All"
        ? stories
        : stories.filter(story => {
            if (filter === "NRI") return story.plan === "NRI";
            if (filter === "Therapy") return story.plan === "Therapy";
            if (filter === "Everyday Yoga") return story.plan === "Everyday Yoga";
            return true;
        });

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
                    {filteredStories.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No stories found for this category.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredStories.map((story) => (
                                <div key={story.id} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-serif text-xl text-gray-800">{story.name}</h3>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest">{story.location}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-accent/20 text-secondary text-[10px] font-bold uppercase tracking-widest rounded">
                                            {story.plan}
                                        </span>
                                    </div>

                                    <div className="mb-6 flex-grow">
                                        <div className="text-secondary text-4xl font-serif leading-none mb-2">“</div>
                                        <p className="text-gray-700 italic relative z-10 pl-4">
                                            {story.quote}
                                        </p>
                                    </div>

                                    {story.beforeAfter && (
                                        <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 mb-6 border-l-2 border-primary/30">
                                            <p>{story.beforeAfter}</p>
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
