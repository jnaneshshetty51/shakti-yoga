import Image from "next/image";
import Link from "next/link";

export default function Founder() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
                {/* Visual Founder Card */}
                <div className="flex-1 w-full relative">
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
                            <p className="font-serif italic text-base sm:text-lg leading-relaxed text-white/95">
                                Yoga changed the direction of my life. My purpose is to share that journey with others.
                            </p>
                            <p className="mt-3 font-sans text-xs uppercase tracking-widest text-secondary font-semibold">
                                — Acharya Swastik, Founder
                            </p>
                        </div>
                    </div>
                </div>

                {/* Founder Bio Text */}
                <div className="flex-1 w-full">
                    <div className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4 rounded">
                        Our Founder
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4 sm:mb-6">Meet Acharya Swastik</h2>
                    <p className="font-sans text-text/80 leading-relaxed mb-4 text-sm sm:text-base">
                        Acharya Swastik&rsquo;s path to yoga began far from a mat — in engineering — before a deeper calling
                        led him to leave that path behind and pursue yoga as his life&rsquo;s work, earning an MSc in Yoga
                        from Mangalore University.
                    </p>
                    <p className="font-sans text-text/80 leading-relaxed mb-8 text-sm sm:text-base">
                        Shaped by a lifelong connection to the Devi tradition, he founded Shakti Yoga Kendra in Udupi to
                        share an authentic, disciplined practice with students far beyond India&rsquo;s shores — creating a
                        sanctuary where ancient yogic science meets everyday life.
                    </p>

                    <Link
                        href="/about#founder"
                        className="inline-block px-6 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold shadow-sm"
                    >
                        Read My Story →
                    </Link>
                </div>
            </div>
        </section>
    );
}
