import PageHeader from "@/components/PageHeader";
import WhyUs from "@/components/WhyUs";
import Image from "next/image";
import Link from "next/link";
import TrialLink from "@/components/TrialLink";
import type { Metadata } from "next";
import { getAboutPageContent } from "@/lib/cms";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "About Us — The Lineage, Philosophy & Founder",
    description: "The story, teachers and philosophy behind Shakti Yoga — authentic practice from India for a global community.",
    alternates: { canonical: "/about" },
};

const PILLARS = [
    {
        title: "Lineage Without Dogma",
        icon: "🕉️",
        desc: "Rooted in classical Hatha and Patanjali’s Ashtanga yoga, taught with clarity, accessibility, and reverence for timeless wisdom without rigidity.",
    },
    {
        title: "Anatomical Safety & Alignment",
        icon: "⚖️",
        desc: "Every movement is cued with biomechanical precision. We adapt asanas to your unique body, protecting joints and decompressing the spine.",
    },
    {
        title: "Pranayama as Medicine",
        icon: "🌬️",
        desc: "Breath is the bridge between body and mind. Every session integrates formal breath pacing to calm the nervous system and reset stress.",
    },
    {
        title: "Personal Guidance (Guru-Shishya)",
        icon: "🤝",
        desc: "You are not a statistic or an anonymous viewer of a video library. Our teachers observe your camera feed, know your injuries, and guide your path.",
    },
];

export default async function AboutPage() {
    const cms = await getAboutPageContent();

    return (
        <main className="bg-background min-h-screen">
            <PageHeader
                title={cms.header_title}
                subtitle={cms.header_subtitle}
            />

            <section className="py-16 sm:py-20 px-4 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Story Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 items-center mb-20">
                        <div>
                            <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Our Origins</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-primary mb-6">{cms.story_title}</h2>
                            <p className="font-sans text-text/80 leading-relaxed mb-5 text-sm sm:text-base">
                                {cms.story_p1}
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-5 text-sm sm:text-base">
                                {cms.story_p2}
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                {cms.story_p3}
                            </p>
                        </div>
                        <div className="relative h-[360px] sm:h-[420px] rounded-3xl overflow-hidden shadow-xl border border-primary/10">
                            <Image
                                src="/philosophy.webp"
                                alt="Philosophy of Shakti Yoga Kendra"
                                fill
                                className="object-cover"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                        </div>
                    </div>

                    {/* Mission Quote */}
                    <div className="text-center max-w-3xl mx-auto my-16 sm:my-24 p-8 sm:p-12 rounded-3xl bg-accent/30 border border-primary/10">
                        <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-3">Our Core Mission</span>
                        <p className="font-serif text-xl sm:text-2xl md:text-3xl text-primary italic leading-relaxed">
                            &ldquo;{cms.mission_quote}&rdquo;
                        </p>
                    </div>

                    {/* Founder Section */}
                    <div id="founder" className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 items-center pt-8 mb-20 scroll-mt-24">
                        <div>
                            <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Our Founder &amp; Acharya</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-primary mb-5">{cms.founder_title}</h2>
                            <p className="font-serif italic text-base sm:text-lg text-secondary mb-5 leading-relaxed font-medium">
                                &ldquo;{cms.founder_tagline}&rdquo;
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-4 text-sm sm:text-base">
                                {cms.founder_bio_p1}
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-4 text-sm sm:text-base">
                                {cms.founder_bio_p2}
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                {cms.founder_bio_p3}
                            </p>
                        </div>
                        <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                            <Image
                                src="/founder.webp"
                                alt="Acharya Swasthik, Founder of Shakti Yoga Kendra"
                                fill
                                className="object-cover"
                                sizes="(min-width: 768px) 40vw, 90vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6 text-white">
                                <span className="text-secondary text-4xl font-serif leading-none select-none">&ldquo;</span>
                                <p className="font-serif italic text-sm sm:text-base leading-relaxed text-white/95">
                                    A centre where every student is known, supported, and encouraged throughout their journey.
                                </p>
                                <p className="mt-3 font-sans text-xs uppercase tracking-widest text-secondary font-semibold">
                                    — Acharya Swasthik, Founder
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Four Core Pillars of Practice */}
                    <div className="py-12 border-t border-primary/10">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Our Methodology</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-primary">The Four Pillars of Our Teaching</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PILLARS.map((pillar, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <span className="text-3xl block mb-4">{pillar.icon}</span>
                                        <h3 className="font-serif font-bold text-lg text-text mb-2">{pillar.title}</h3>
                                        <p className="font-sans text-xs sm:text-sm text-text/70 leading-relaxed">
                                            {pillar.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Prompt */}
                    <div className="mt-16 text-center pt-8 border-t border-primary/10">
                        <h3 className="font-serif text-2xl sm:text-3xl text-primary mb-4">Step Onto Your Mat With Us</h3>
                        <p className="font-sans text-text/70 text-sm max-w-lg mx-auto mb-8">
                            Experience our warm teaching style, real-time posture adjustments, and daily community support.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <TrialLink
                                href="/trial"
                                className="px-8 py-3.5 bg-secondary text-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary transition-colors shadow-md"
                            >
                                Book Free Trial Class
                            </TrialLink>
                            <Link
                                href="/yoga-therapy/start"
                                className="px-8 py-3.5 border-2 border-primary text-primary font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-colors"
                            >
                                Book 1:1 Therapy Consult
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <WhyUs />
        </main>
    );
}
