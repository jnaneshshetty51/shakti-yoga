import PageHeader from "@/components/PageHeader";
import WhyUs from "@/components/WhyUs";
import Image from "next/image";

export default function AboutPage() {
    return (
        <main>
            <PageHeader
                title="About Shakti Yoga Kendra"
                subtitle="A sanctuary for authentic yoga, healing, and self-discovery, bridging ancient wisdom with modern life."
            />

            <section className="py-20 px-8 bg-background">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
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
                                src="/philosophy.png"
                                alt="Our Story"
                                fill
                                className="object-cover"
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
                </div>
            </section>

            <WhyUs />
        </main>
    );
}
