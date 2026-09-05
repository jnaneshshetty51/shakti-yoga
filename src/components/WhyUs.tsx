export default function WhyUs() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-primary text-white">
            <div className="max-w-6xl mx-auto text-center">
                <h2 className="font-serif text-3xl md:text-4xl mb-10 sm:mb-12">Why Shakti Yoga Kendra?</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl">
                            🕉️
                        </div>
                        <h3 className="font-serif text-xl mb-4">Authentic Lineage</h3>
                        <p className="font-sans text-white/80 leading-relaxed text-sm sm:text-base">
                            Rooted in traditional Hatha and Ashtanga yoga, passed down through experienced gurus.
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl">
                            🌍
                        </div>
                        <h3 className="font-serif text-xl mb-4">Global Community</h3>
                        <p className="font-sans text-white/80 leading-relaxed text-sm sm:text-base">
                            Join hundreds of NRIs and students from across the globe finding balance together.
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl">
                            🧘
                        </div>
                        <h3 className="font-serif text-xl mb-4">Therapeutic Focus</h3>
                        <p className="font-sans text-white/80 leading-relaxed text-sm sm:text-base">
                            Specialized attention to physical and mental health through personalized therapy plans.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
