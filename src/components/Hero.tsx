import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative min-h-[85vh] py-16 sm:py-20 w-full flex items-center justify-center text-center text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <Image
                    src="/hero.png"
                    alt="Peaceful yoga studio"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute top-0 left-0 w-full h-full bg-black/40"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 px-4 sm:px-8 max-w-4xl mx-auto">
                <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl font-bold tracking-wide leading-tight drop-shadow-lg">
                    Premium Online Yoga & Therapy for NRIs, from India’s Heart
                </h1>
                <p className="font-sans text-base sm:text-lg md:text-xl font-light tracking-wide drop-shadow-md max-w-2xl text-white/90">
                    Everyday yoga classes (5 days/week) + personalised 1:1 yoga therapy.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-2 sm:mt-4 w-full sm:w-auto">
                    <Link href="/trial" className="w-full sm:w-auto text-center px-8 py-3.5 bg-secondary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-primary transition-colors shadow-lg">
                        Start Free Trial
                    </Link>
                    <Link href="/yoga-therapy/start" className="w-full sm:w-auto text-center px-8 py-3.5 bg-white hover:bg-accent text-text font-sans font-bold text-sm uppercase tracking-widest rounded transition-all transform hover:-translate-y-0.5 shadow-lg">
                        Book 1:1 Yoga Therapy
                    </Link>
                </div>

                <div className="mt-4 sm:mt-8 py-2.5 px-4 sm:px-6 bg-black/30 backdrop-blur-sm rounded-2xl sm:rounded-full border border-white/20 text-xs sm:text-sm tracking-wider uppercase font-light max-w-full">
                    Live from India · Classes start 5:00 AM IST · WhatsApp support
                </div>
            </div>
        </section>
    );
}
