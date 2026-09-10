import Link from "next/link";

const PRACTICES = [
    "2-minute breathing",
    "5-minute desk reset",
    "10-minute relaxation",
    "Midday pause",
    "Wind-down practice",
];

export default function TakeAMoment() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-primary text-white text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl mb-4 sm:mb-6">A Little Yoga, Wherever You Are.</h2>
                <p className="font-sans text-base sm:text-lg opacity-90 mb-8 sm:mb-10 font-light">
                    Short, guided practices you can reach for between classes — right from the Shakti app.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {PRACTICES.map((practice) => (
                        <span
                            key={practice}
                            className="px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-sans"
                        >
                            {practice}
                        </span>
                    ))}
                </div>

                <Link
                    href="/dashboard"
                    className="inline-block px-8 py-3.5 bg-white text-primary font-sans font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-0.5 shadow-lg"
                >
                    Explore Shakti →
                </Link>
            </div>
        </section>
    );
}
