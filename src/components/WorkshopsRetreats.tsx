import Link from "next/link";

export default function WorkshopsRetreats() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-5xl mx-auto text-center">
                <h2 className="font-serif text-3xl md:text-4xl text-primary mb-10 sm:mb-12">Workshops & Retreats</h2>

                <div className="grid md:grid-cols-2 gap-6 sm:gap-8 text-left mb-10 sm:mb-12">
                    <div className="bg-accent p-6 sm:p-8 rounded-lg shadow-sm border border-primary/10">
                        <h3 className="font-serif text-xl sm:text-2xl text-secondary mb-3">Workshops & Events</h3>
                        <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                            Deepen your practice through focused sessions and special experiences.
                        </p>
                    </div>
                    <div className="bg-accent p-6 sm:p-8 rounded-lg shadow-sm border border-primary/10">
                        <h3 className="font-serif text-xl sm:text-2xl text-secondary mb-3">Retreats</h3>
                        <p className="font-sans text-text/80 leading-relaxed text-sm sm:text-base">
                            Step away from everyday life and reconnect with yourself.
                        </p>
                    </div>
                </div>

                <Link
                    href="/retreats"
                    className="inline-block px-6 py-3.5 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors font-bold"
                >
                    Explore Upcoming Experiences →
                </Link>
            </div>
        </section>
    );
}
