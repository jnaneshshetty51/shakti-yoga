import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative min-h-[85vh] py-16 sm:py-20 w-full flex items-center justify-center text-center text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <Image
                    src="/hero.webp"
                    alt="Peaceful yoga studio"
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                    fetchPriority="high"
                />
                <div className="absolute top-0 left-0 w-full h-full bg-black/40"></div>
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-5 sm:gap-6 sm:px-8">
                <h1 className="w-full font-serif text-[1.9rem] font-bold leading-[1.15] tracking-wide drop-shadow-lg sm:text-4xl md:text-6xl md:leading-tight">
                    Premium Online Yoga &amp; Therapy for NRIs, from India&rsquo;s Heart
                </h1>
                <p className="w-full max-w-2xl font-sans text-base font-light leading-relaxed tracking-wide drop-shadow-md text-white/90 sm:text-lg md:text-xl">
                    Everyday yoga classes (5 days/week) + personalised 1:1 yoga therapy.
                </p>

                <div className="mt-2 flex w-full flex-col gap-3 sm:mt-4 sm:w-auto sm:flex-row sm:gap-4">
                    <Link href="/trial" className="w-full sm:w-auto text-center px-8 py-3.5 bg-secondary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-primary transition-colors shadow-lg">
                        Start Free Trial
                    </Link>
                    <Link href="/yoga-therapy/start" className="w-full sm:w-auto text-center px-8 py-3.5 bg-white hover:bg-accent text-text font-sans font-bold text-sm uppercase tracking-widest rounded transition-all transform hover:-translate-y-0.5 shadow-lg">
                        Book 1:1 Yoga Therapy
                    </Link>
                </div>

                <div className="mt-4 max-w-full whitespace-normal rounded-2xl border border-white/20 bg-black/30 px-4 py-2.5 text-center text-[11px] font-light uppercase leading-relaxed tracking-wider backdrop-blur-sm sm:mt-8 sm:rounded-full sm:px-6 sm:text-sm">
                    Live from India · Classes start 5:00 AM IST · WhatsApp support
                </div>
            </div>
        </section>
    );
}
