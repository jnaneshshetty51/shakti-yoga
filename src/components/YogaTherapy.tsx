import Image from 'next/image';
import Link from 'next/link';

export default function YogaTherapy() {
    return (
        <section id="therapy" className="py-20 px-8 bg-background">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 relative h-[500px] w-full rounded-lg overflow-hidden shadow-xl">
                    <Image
                        src="/philosophy.png"
                        alt="Yoga Therapy Session"
                        fill
                        className="object-cover"
                    />
                </div>

                <div className="flex-1">
                    <div className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4 rounded">
                        Personalized Healing
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl text-primary mb-6">1:1 Yoga Therapy</h2>
                    <p className="font-sans text-text/80 leading-relaxed mb-6">
                        Our Yoga Therapy is not just about exercise; it's a holistic approach to healing.
                        We design personalized plans focusing on your specific health conditions,
                        whether it's chronic pain, anxiety, hormonal imbalances, or recovery from injury.
                    </p>

                    <ul className="space-y-4 mb-8 font-sans text-text/80">
                        <li className="flex items-center gap-3">
                            <span className="text-secondary">✦</span> Detailed health assessment
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-secondary">✦</span> Customized asanas and pranayama
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-secondary">✦</span> Continuous monitoring and adjustment
                        </li>
                    </ul>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/yoga-therapy/start" className="px-8 py-3 bg-primary text-white font-sans text-sm uppercase tracking-widest rounded hover:bg-secondary transition-colors text-center">
                            Book Therapy Plan ($120/mo)
                        </Link>
                        <Link href="/yoga-therapy/start" className="px-8 py-3 border border-primary text-primary font-sans text-sm uppercase tracking-widest rounded hover:bg-primary/5 transition-colors text-center">
                            Talk to Us First
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
