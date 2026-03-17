import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export default function ProgramsPage() {
    return (
        <main>
            <PageHeader
                title="Our Programs"
                subtitle="Choose the path that suits your lifestyle. From daily group energy to personalized one-on-one healing."
            />

            {/* Plan Cards */}
            <section className="py-20 px-8 bg-background">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
                    {/* Plan 1: Everyday Yoga */}
                    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-t-4 border-secondary relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-bl">
                            Most Popular
                        </div>
                        <h3 className="font-serif text-3xl text-text mb-2">Everyday Yoga</h3>
                        <p className="font-sans text-sm text-text/60 uppercase tracking-widest mb-6">Group Classes</p>

                        <div className="text-5xl font-serif text-primary mb-6">
                            $59<span className="text-lg text-text/50 font-sans">/month</span>
                        </div>

                        <p className="font-sans text-text/80 mb-8 leading-relaxed">
                            Perfect for maintaining general fitness, flexibility, and mental peace.
                            Join our supportive community and build a consistent daily habit.
                        </p>

                        <ul className="space-y-4 mb-8 font-sans text-text/80 flex-grow">
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span><strong>5 Live Classes</strong> per week</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span>Flexible <strong>IST timings</strong> (Morning & Evening)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span>Focus on <strong>Stress Relief & Flexibility</strong></span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span><strong>Free 1 Trial Class</strong> included</span>
                            </li>
                        </ul>

                        <div className="space-y-3 mt-auto">
                            <Link href="/trial" className="block w-full py-4 text-center bg-primary text-white font-sans uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors shadow-md">
                                Start Free Trial
                            </Link>
                            <Link href="/signup?plan=everyday" className="block w-full py-4 text-center border border-primary text-primary font-sans uppercase tracking-widest text-sm rounded hover:bg-primary/5 transition-colors">
                                Subscribe Now
                            </Link>
                        </div>
                    </div>

                    {/* Plan 2: Yoga Therapy */}
                    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-t-4 border-primary flex flex-col">
                        <h3 className="font-serif text-3xl text-text mb-2">Yoga Therapy</h3>
                        <p className="font-sans text-sm text-text/60 uppercase tracking-widest mb-6">1:1 Personalized</p>

                        <div className="text-5xl font-serif text-primary mb-6">
                            $120<span className="text-lg text-text/50 font-sans">/month</span>
                        </div>

                        <p className="font-sans text-text/80 mb-8 leading-relaxed">
                            Designed for deep healing and addressing specific health conditions.
                            Get a fully customized practice tailored to your body's needs.
                        </p>

                        <ul className="space-y-4 mb-8 font-sans text-text/80 flex-grow">
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span><strong>4 Personalized Sessions</strong> per month</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span>Detailed <strong>Health Assessment</strong></span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span>For <strong>Pain, Anxiety, Chronic Issues</strong></span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-600 text-xl">✓</span>
                                <span>Ongoing <strong>Plan Adjustments</strong></span>
                            </li>
                        </ul>

                        <div className="space-y-3 mt-auto">
                            <Link href="/yoga-therapy/start" className="block w-full py-4 text-center bg-secondary text-white font-sans uppercase tracking-widest text-sm rounded hover:bg-primary transition-colors shadow-md">
                                Book 1:1 Plan
                            </Link>
                            <Link href="/yoga-therapy/start" className="block w-full py-4 text-center border border-secondary text-secondary font-sans uppercase tracking-widest text-sm rounded hover:bg-secondary/5 transition-colors">
                                Schedule Intro Call
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-20 px-8 bg-accent/30">
                <div className="max-w-5xl mx-auto">
                    <h2 className="font-serif text-3xl text-primary text-center mb-12">Compare Plans</h2>

                    <div className="bg-white rounded-lg shadow-sm border border-primary/10 overflow-hidden">
                        <div className="grid grid-cols-3 bg-primary text-white p-6 font-serif font-bold text-lg md:text-xl">
                            <div>Feature</div>
                            <div className="text-center">Everyday Yoga</div>
                            <div className="text-center">Yoga Therapy</div>
                        </div>

                        <div className="divide-y divide-gray-100 font-sans text-text/80">
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-primary">Format</div>
                                <div className="text-center">Live Group Classes</div>
                                <div className="text-center">1:1 Private Sessions</div>
                            </div>
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-primary">Focus</div>
                                <div className="text-center">General Fitness & Flow</div>
                                <div className="text-center">Specific Healing & Recovery</div>
                            </div>
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-primary">Attention Level</div>
                                <div className="text-center">General Corrections</div>
                                <div className="text-center">100% Personalized Attention</div>
                            </div>
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-primary">Flexibility</div>
                                <div className="text-center">Choose any batch time</div>
                                <div className="text-center">Scheduled per your convenience</div>
                            </div>
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-primary">Who it's for</div>
                                <div className="text-center">Beginners to Advanced</div>
                                <div className="text-center">Those with health conditions</div>
                            </div>
                            <div className="grid grid-cols-3 p-6 hover:bg-gray-50 transition-colors bg-accent/10">
                                <div className="font-bold text-primary">Price</div>
                                <div className="text-center font-bold text-lg">$59 / month</div>
                                <div className="text-center font-bold text-lg">$120 / month</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Add-ons / Included */}
            <section className="py-20 px-8 bg-background">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="font-serif text-3xl text-primary mb-12">Everything You Need to Succeed</h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-lg border border-primary/10 bg-white">
                            <div className="text-4xl mb-4">📱</div>
                            <h3 className="font-serif text-xl text-text mb-2">Community Access</h3>
                            <p className="text-sm text-text/70">
                                Included in both plans. Join our exclusive WhatsApp group for daily tips and motivation.
                            </p>
                        </div>

                        <div className="p-6 rounded-lg border border-primary/10 bg-white">
                            <div className="text-4xl mb-4">💬</div>
                            <h3 className="font-serif text-xl text-text mb-2">Teacher Support</h3>
                            <p className="text-sm text-text/70">
                                Direct access to teachers for queries. We are here to guide your journey.
                            </p>
                        </div>

                        <div className="p-6 rounded-lg border border-secondary/30 bg-secondary/5">
                            <div className="text-4xl mb-4">🥗</div>
                            <h3 className="font-serif text-xl text-secondary mb-2">Lifestyle Guidance</h3>
                            <p className="text-sm text-text/70">
                                <strong>Therapy Exclusive:</strong> Optional nutritional and lifestyle advice to support your healing.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
