const POINTS = [
    "Live online classes",
    "Indian teachers",
    "Traditional foundation",
    "Modern accessibility",
    "Students across countries",
];

export default function ShaktiDifference() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-accent/40">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4 sm:mb-6">From Udupi → To the World</h2>
                <p className="font-sans text-text/80 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto text-sm sm:text-base">
                    We believe authentic yoga should be accessible beyond borders.
                </p>

                <div className="flex items-center justify-center gap-4 sm:gap-8 mb-10 sm:mb-12">
                    <div className="flex flex-col items-center">
                        <span className="text-4xl sm:text-5xl">🇮🇳</span>
                        <span className="mt-2 font-sans text-xs uppercase tracking-widest text-text/60">Udupi, India</span>
                    </div>
                    <span className="text-2xl sm:text-3xl text-secondary">→</span>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl sm:text-5xl">🌎</span>
                        <span className="mt-2 font-sans text-xs uppercase tracking-widest text-text/60">Global Students</span>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                    {POINTS.map((point) => (
                        <span
                            key={point}
                            className="px-4 py-2 bg-white text-primary font-sans text-xs sm:text-sm rounded-full border border-primary/10 shadow-sm"
                        >
                            {point}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
