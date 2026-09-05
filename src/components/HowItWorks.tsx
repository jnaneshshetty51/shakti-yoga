export default function HowItWorks() {
    const steps = [
        {
            number: "01",
            title: "Choose Your Plan",
            description: "Select between our Everyday Yoga group classes or personalized 1:1 Yoga Therapy."
        },
        {
            number: "02",
            title: "Book Trial / Consultation",
            description: "Experience a free trial class or have a detailed consultation with our therapists."
        },
        {
            number: "03",
            title: "Join Live",
            description: "Connect via Zoom/Meet from the comfort of your home. Flexible IST timings available."
        },
        {
            number: "04",
            title: "Track Progress",
            description: "See tangible improvements in your physical and mental well-being over time."
        }
    ];

    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-6xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary text-center mb-10 sm:mb-16">How It Works</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-6">
                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center group bg-white sm:bg-transparent p-6 sm:p-0 rounded-lg shadow-sm sm:shadow-none border border-primary/5 sm:border-none">
                            <div className="text-5xl sm:text-6xl font-serif text-secondary/30 font-bold mb-3 group-hover:text-secondary/50 transition-colors">
                                {step.number}
                            </div>
                            <h3 className="font-serif text-xl text-text mb-2">{step.title}</h3>
                            <p className="font-sans text-sm text-text/70 leading-relaxed">{step.description}</p>

                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-12 -right-1/2 w-full h-[1px] bg-secondary/20"></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-10 sm:mt-16 text-center p-5 sm:p-6 bg-accent/50 rounded-lg border border-primary/10 max-w-2xl mx-auto">
                    <p className="font-sans text-xs sm:text-sm text-text/80">
                        <span className="font-bold text-primary">Note:</span> IST slots available from <span className="font-bold">6:00 AM – 12:45 PM</span> & <span className="font-bold">2:30 PM – 10:15 PM</span>. We assign the best batch for your timezone.
                    </p>
                </div>
            </div>
        </section>
    );
}
