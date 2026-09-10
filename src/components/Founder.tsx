import Link from "next/link";

export default function Founder() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
                <div className="flex-1 w-full">
                    <div className="relative bg-primary text-white rounded-3xl p-8 sm:p-12 shadow-xl">
                        <span className="absolute top-6 left-8 font-serif text-6xl text-secondary/60 leading-none select-none">&ldquo;</span>
                        <p className="font-serif italic text-xl sm:text-2xl leading-relaxed relative z-10">
                            Yoga changed the direction of my life. My purpose is to share that journey with others.
                        </p>
                        <p className="mt-6 font-sans text-xs uppercase tracking-widest text-secondary">
                            — Acharya Swastik, Founder
                        </p>
                    </div>
                </div>

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
                        share an authentic, disciplined practice with students far beyond India&rsquo;s shores.
                    </p>

                    <Link
                        href="/about#founder"
                        className="inline-block px-6 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold"
                    >
                        Read My Story →
                    </Link>
                </div>
            </div>
        </section>
    );
}
