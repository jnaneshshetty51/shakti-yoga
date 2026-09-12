import PageHeader from "@/components/PageHeader";
import WhyUs from "@/components/WhyUs";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

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

export default function AboutPage() {
    return (
        <main className="bg-background min-h-screen">
            <PageHeader
                title="About Shakti Yoga Kendra"
                subtitle="A sanctuary for authentic yoga, healing, and self-discovery, bridging sacred Indian wisdom with modern daily living."
            />

            <section className="py-16 sm:py-20 px-4 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Story Section */}
                    <div className="grid md:grid-cols-2 gap-12 sm:gap-16 items-center mb-20">
                        <div>
                            <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Our Origins</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-primary mb-6">Born from Ancient Soil, Guided to the World</h2>
                            <p className="font-sans text-text/80 leading-relaxed mb-5 text-sm sm:text-base">
                                Shakti Yoga Kendra was founded in Udupi, Karnataka — a sacred coastal land known for its centuries of contemplative tradition, temple architecture, and vibrant yogic heritage.
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-5 text-sm sm:text-base">
                                While modern yoga is often reduced to fast-paced physical acrobatics, we created Shakti Yoga to preserve yoga&rsquo;s true essence: a holistic discipline unifying the physical sheath (Annamaya), breath energy (Pranamaya), and contemplative mind (Manomaya).
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                Today, our teachers broadcast live every day from India to dedicated students, NRIs, and seekers across North America, the UK, Europe, Australia, and the Middle East — cultivating personal connection across continents.
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
                            &ldquo;To empower seekers worldwide to rediscover their dormant inner vitality (Shakti) through the living science of traditional yoga, bringing balance, healing, and peace to modern life.&rdquo;
                        </p>
                    </div>

                    {/* Founder Section */}
                    <div id="founder" className="grid md:grid-cols-2 gap-12 sm:gap-16 items-center pt-8 mb-20 scroll-mt-24">
                        <div>
                            <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Our Founder &amp; Acharya</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-primary mb-5">Meet Acharya Swastik</h2>
                            <p className="font-serif italic text-base sm:text-lg text-secondary mb-5 leading-relaxed font-medium">
                                &ldquo;Yoga was not merely a career decision. It completely rewired how I perceive vitality, human suffering, and spiritual freedom.&rdquo;
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-4 text-sm sm:text-base">
                                Acharya Swastik&rsquo;s path to yoga began far from a mat — in the demanding field of engineering. Experiencing firsthand the cognitive strain, physical stagnation, and inner restlessness of modern work, a deeper calling led him to walk away from corporate life and dedicate himself fully to the traditional yogic sciences.
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-4 text-sm sm:text-base">
                                He earned his Master of Science (M.Sc.) in Yogic Science from Mangalore University, immersing himself in classical texts, human anatomy, therapeutic yoga protocols, and Sanskrit scriptures.
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                Steeped in the coastal Devi tradition, Acharya Swastik established Shakti Yoga Kendra as a sanctuary where seekers are recognized, corrected, and nurtured through disciplined, compassionate daily sadhana.
                            </p>
                        </div>
                        <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                            <Image
                                src="/founder.webp"
                                alt="Acharya Swastik, Founder of Shakti Yoga Kendra"
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
                                    — Acharya Swastik, Founder
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
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            <Link
                                href="/trial"
                                className="px-8 py-3.5 bg-secondary text-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary transition-colors shadow-md"
                            >
                                Start 7-Day Free Trial
                            </Link>
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
