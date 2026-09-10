export default function WhyUs() {
    const pillars = [
        {
            icon: "🕉️",
            title: "Tradition",
            description: "Yoga rooted in the Indian tradition and taught with respect for its deeper purpose.",
        },
        {
            icon: "🙏",
            title: "Personal Guidance",
            description: "Learn with experienced teachers who understand that every person's journey is different.",
        },
        {
            icon: "🇮🇳",
            title: "Authentic Indian Roots",
            description: "From Udupi, India, bringing an authentic Indian yoga experience to students around the world.",
        },
        {
            icon: "🤝",
            title: "A Human Connection",
            description: "A centre where students are known, supported and encouraged throughout their journey.",
        },
    ];

    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-primary text-white">
            <div className="max-w-6xl mx-auto text-center">
                <h2 className="font-serif text-3xl md:text-4xl mb-10 sm:mb-12">More Than a Yoga Class</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
                    {pillars.map((pillar) => (
                        <div key={pillar.title} className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl">
                                {pillar.icon}
                            </div>
                            <h3 className="font-serif text-xl mb-4">{pillar.title}</h3>
                            <p className="font-sans text-white/80 leading-relaxed text-sm sm:text-base">
                                {pillar.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
