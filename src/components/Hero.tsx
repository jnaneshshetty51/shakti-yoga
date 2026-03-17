import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative h-[90vh] w-full flex items-center justify-center text-center text-white overflow-hidden">
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

            <div className="relative z-10 flex flex-col items-center gap-6 px-8 max-w-4xl mx-auto animate-fade-in">
                <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide leading-tight drop-shadow-lg">
                    Premium Online Yoga & Therapy for NRIs, from India’s Heart
                </h1>
                <p className="font-sans text-lg md:text-xl font-light tracking-wide drop-shadow-md max-w-2xl">
                    Everyday yoga classes (5 days/week) + personalised 1:1 yoga therapy.
                </p>

                <div className="flex flex-col md:flex-row gap-4 mt-4">
                    <Link href="/trial" className="px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg">
                        Start Free Trial
                    </Link>
                    <Link href="/yoga-therapy/start" className="px-8 py-4 bg-white hover:bg-accent text-text font-sans text-sm uppercase tracking-widest rounded transition-all transform hover:-translate-y-1 shadow-lg">
                        Book 1:1 Yoga Therapy
                    </Link>
                </div>

                <div className="mt-8 py-2 px-6 bg-black/20 backdrop-blur-sm rounded-full border border-white/20 text-xs md:text-sm tracking-wider uppercase font-light">
                    Live from India · Classes start 5:00 AM IST · WhatsApp support community
                </div>
            </div>
        </section>
    );
}
