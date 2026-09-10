import Link from "next/link";

export default function FinalCTA() {
    return (
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-primary text-white text-center">
            <div className="max-w-2xl mx-auto">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6">Your Yoga Journey Can Begin Today.</h2>
                <p className="font-sans text-base sm:text-lg opacity-90 mb-8 sm:mb-10 font-light">
                    Whether you&rsquo;re looking for a regular yoga practice or personalized Yoga Therapy, we&rsquo;re here to guide you.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/trial"
                        className="w-full sm:w-auto px-8 py-3.5 bg-white text-primary font-sans font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-0.5 shadow-lg text-center"
                    >
                        Start Free Trial
                    </Link>
                    <Link
                        href="/yoga-therapy"
                        className="w-full sm:w-auto px-8 py-3.5 border border-white text-white font-sans font-bold uppercase tracking-widest text-sm rounded hover:bg-white hover:text-primary transition-all text-center"
                    >
                        Explore Yoga Therapy
                    </Link>
                </div>
            </div>
        </section>
    );
}
