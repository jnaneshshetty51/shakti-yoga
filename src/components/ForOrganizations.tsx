import Link from "next/link";

const OFFERINGS = [
    "Employee wellness",
    "Group yoga",
    "Custom programs",
    "Workshops",
    "Corporate packages",
];

export default function ForOrganizations() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-accent/40">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4 sm:mb-6">Bring Yoga Into Your Workplace</h2>
                <p className="font-sans text-text/80 leading-relaxed mb-8 max-w-2xl mx-auto text-sm sm:text-base">
                    Wellness programs designed for teams — from a single workshop to an ongoing corporate package.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {OFFERINGS.map((offering) => (
                        <span
                            key={offering}
                            className="px-4 py-2 bg-white text-primary font-sans text-xs sm:text-sm rounded-full border border-primary/10 shadow-sm"
                        >
                            {offering}
                        </span>
                    ))}
                </div>

                <Link
                    href="/corporate"
                    className="inline-block px-6 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold"
                >
                    Talk to Shakti →
                </Link>
            </div>
        </section>
    );
}
