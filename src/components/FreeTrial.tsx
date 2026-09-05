import Link from 'next/link';

export default function FreeTrial() {
    return (
        <section id="free-trial" className="py-12 sm:py-20 px-4 sm:px-8 bg-primary text-white text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">Not sure where to start?</h2>
                <p className="font-sans text-base sm:text-lg md:text-xl opacity-90 mb-8 sm:mb-10 font-light">
                    Get a FREE trial class and a short consultation to see if we are the right fit for you.
                </p>

                <Link href="/trial" className="inline-block w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 bg-white text-primary font-sans font-bold uppercase tracking-widest text-sm sm:text-base rounded hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-0.5 shadow-lg">
                    Get Your Free Trial Class
                </Link>

                <p className="mt-6 text-xs opacity-70 uppercase tracking-wider">
                    Limited slots available per week
                </p>
            </div>
        </section>
    );
}
