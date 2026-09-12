import PageHeader from "@/components/PageHeader";
import WhyUs from "@/components/WhyUs";
import Image from "next/image";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About",
    description: "The story, teachers and philosophy behind Shakti Yoga — authentic practice from India for a global community.",
    alternates: { canonical: "/about" },
};

export default function AboutPage() {
    return (
        <main>
            <PageHeader
                title="About Shakti Yoga Kendra"
                subtitle="A sanctuary for authentic yoga, healing, and self-discovery, bridging ancient wisdom with modern life."
            />

            <section className="py-20 px-8 bg-background">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
                        <div>
                            <h2 className="font-serif text-3xl text-primary mb-6">Our Story</h2>
                            <p className="font-sans text-text/80 leading-relaxed mb-6">
                                Shakti Yoga Kendra was born from a deep desire to share the transformative power of traditional yoga with the world.
                                What started as a small studio in the heart of India has now grown into a global community, connecting NRIs and
                                seekers from every corner of the earth to their roots.
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed">
                                We believe that yoga is not just a physical exercise but a path to inner peace and holistic health.
                                Our approach combines the precision of Hatha Yoga, the flow of Vinyasa, and the therapeutic benefits of
                                personalized healing practices.
                            </p>
                        </div>
                        <div className="relative h-[400px] rounded-lg overflow-hidden shadow-lg">
                            <Image
                                src="/philosophy.webp"
                                alt="Our Story"
                                fill
                                className="object-cover"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                        </div>
                    </div>

                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="font-serif text-3xl text-primary mb-8">Our Mission</h2>
                        <p className="font-serif text-xl md:text-2xl text-text/70 italic leading-relaxed">
                            "To empower individuals to find their inner strength (Shakti) through the timeless wisdom of Yoga,
                            creating a healthier, happier, and more conscious world."
                        </p>
                    </div>

                    <div id="founder" className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center scroll-mt-24">
                        <div>
                            <h2 className="font-serif text-3xl text-primary mb-6">Meet Acharya Swastik</h2>
                            <p className="font-serif italic text-lg text-text/70 mb-6 leading-relaxed">
                                "Yoga changed the direction of my life. My purpose is to share that journey with others."
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed mb-6">
                                Acharya Swastik&rsquo;s path to yoga began far from a mat — in engineering — before a deeper
                                calling led him to leave that path behind and pursue yoga as his life&rsquo;s work, earning an
                                MSc in Yoga from Mangalore University.
                            </p>
                            <p className="font-sans text-text/80 leading-relaxed">
                                Shaped by a lifelong connection to the Devi tradition, he founded Shakti Yoga Kendra in Udupi
                                to share an authentic, disciplined practice with students far beyond India&rsquo;s shores —
                                a centre where every student is known, supported and guided on their own journey.
                            </p>
                        </div>
                        <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-xl border-4 border-white">
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
                                <p className="font-serif italic text-base sm:text-lg leading-relaxed text-white/95">
                                    A centre where students are known, supported and encouraged throughout their journey.
                                </p>
                                <p className="mt-3 font-sans text-xs uppercase tracking-widest text-secondary font-semibold">
                                    — Acharya Swastik, Founder
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <WhyUs />
        </main>
    );
}
