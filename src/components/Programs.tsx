import Link from 'next/link';

export default function Programs() {
    return (
        <section id="programs" className="py-20 px-8 bg-accent/30">
            <div className="max-w-6xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary text-center mb-16">Our Programs</h2>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Card 1: Everyday Yoga */}
                    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-t-4 border-secondary relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-bl">
                            Most Popular
                        </div>
                        <h3 className="font-serif text-2xl text-text mb-2">Everyday Yoga</h3>
                        <p className="font-sans text-sm text-text/60 uppercase tracking-widest mb-6">Group Classes</p>

                        <div className="text-4xl font-serif text-primary mb-6">
                            $59<span className="text-lg text-text/50 font-sans">/month</span>
                        </div>

                        <ul className="space-y-4 mb-8 font-sans text-text/80">
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> 5 days a week live sessions
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Flexible IST timings
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Access to community support
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Recordings available
                            </li>
                        </ul>

                        <Link href="/trial" className="block w-full py-4 text-center bg-primary text-white font-sans uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors">
                            Start Free Trial
                        </Link>
                        <p className="text-center text-xs text-text/50 mt-3">No credit card required</p>
                    </div>

                    {/* Card 2: Yoga Therapy */}
                    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-t-4 border-primary">
                        <h3 className="font-serif text-2xl text-text mb-2">Yoga Therapy</h3>
                        <p className="font-sans text-sm text-text/60 uppercase tracking-widest mb-6">1:1 Personalized</p>

                        <div className="text-4xl font-serif text-primary mb-6">
                            $120<span className="text-lg text-text/50 font-sans">/month</span>
                        </div>

                        <ul className="space-y-4 mb-8 font-sans text-text/80">
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Personalized 1:1 sessions
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Custom therapy plan
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Focus on specific health issues
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600">✓</span> Direct access to therapist
                            </li>
                        </ul>

                        <Link href="/yoga-therapy/start" className="block w-full py-4 text-center border border-primary text-primary font-sans uppercase tracking-widest text-sm rounded hover:bg-primary hover:text-white transition-colors">
                            Book Consultation
                        </Link>
                        <p className="text-center text-xs text-text/50 mt-3">Talk to us before you decide</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
