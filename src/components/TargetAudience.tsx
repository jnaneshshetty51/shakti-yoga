export default function TargetAudience() {
    return (
        <section className="py-20 px-8 bg-background text-center">
            <div className="max-w-4xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary mb-12">Who This Is For</h2>

                <div className="grid md:grid-cols-2 gap-12 text-left">
                    <div className="bg-accent p-8 rounded-lg shadow-sm border border-primary/10">
                        <h3 className="font-serif text-2xl text-secondary mb-4">For NRIs Dealing With...</h3>
                        <ul className="space-y-3 font-sans text-text opacity-90">
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Stress, burnout, and anxiety from fast-paced lifestyles</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Chronic back/neck pain and lifestyle-related issues</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Sleep disturbances and lack of energy</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-accent p-8 rounded-lg shadow-sm border border-primary/10">
                        <h3 className="font-serif text-2xl text-secondary mb-4">For Those Seeking...</h3>
                        <ul className="space-y-3 font-sans text-text opacity-90">
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Consistent daily practice (Everyday Yoga)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Deep, personalized healing (1:1 Therapy)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">✦</span>
                                <span>Connection to authentic Indian yoga traditions</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
