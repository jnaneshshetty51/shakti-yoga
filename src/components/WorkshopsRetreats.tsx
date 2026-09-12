import Image from "next/image";
import Link from "next/link";

export default function WorkshopsRetreats() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-6xl mx-auto text-center">
                <div className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4 rounded">
                    Immersive Learning
                </div>
                <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Workshops &amp; Retreats</h2>
                <p className="font-sans text-text/70 text-sm sm:text-base max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed">
                    Step beyond weekly classes. Deepen your understanding of pranayama, philosophy, and alignment in our immersive weekend workshops and Himalayan retreats.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-left mb-10 sm:mb-12">
                    {/* Workshops Card */}
                    <Link
                        href="/retreats"
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-primary/10 flex flex-col"
                    >
                        <div className="relative h-56 sm:h-64 w-full overflow-hidden">
                            <Image
                                src="/workshops/workshop.webp"
                                alt="Yoga Workshops and Intensives"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold uppercase tracking-widest text-secondary shadow-sm">
                                Weekend Intensive
                            </div>
                        </div>
                        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-serif text-2xl text-primary mb-2">Workshops &amp; Masterclasses</h3>
                                <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                    Deep dive into specialized themes — Pranayama Mastery, Spine Health &amp; Sciatica Recovery, and Patanjali Yoga Sutras.
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between text-xs text-text/60">
                                <span>Online via Google Meet · Recordings provided</span>
                                <span className="font-bold text-secondary uppercase tracking-wider">Learn More →</span>
                            </div>
                        </div>
                    </Link>

                    {/* Retreats Card */}
                    <Link
                        href="/retreats"
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-primary/10 flex flex-col"
                    >
                        <div className="relative h-56 sm:h-64 w-full overflow-hidden">
                            <Image
                                src="/workshops/retreat.webp"
                                alt="Himalayan Yoga Retreat"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold uppercase tracking-widest text-secondary shadow-sm">
                                In-Person Immersion
                            </div>
                        </div>
                        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-serif text-2xl text-primary mb-2">Sanctuary Retreats</h3>
                                <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                                    Step away from the noise. Join Acharya Swastik in the sacred foothills of Rishikesh and Udupi for transformative in-person sadhana.
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between text-xs text-text/60">
                                <span>Rishikesh &amp; Udupi, India · Limited cohort</span>
                                <span className="font-bold text-secondary uppercase tracking-wider">Learn More →</span>
                            </div>
                        </div>
                    </Link>
                </div>

                <Link
                    href="/retreats"
                    className="inline-block px-8 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold shadow-sm"
                >
                    Explore Upcoming Experiences →
                </Link>
            </div>
        </section>
    );
}
