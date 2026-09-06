import PageHeader from "@/components/PageHeader";
import YogaTherapy from "@/components/YogaTherapy";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "1:1 Yoga Therapy",
    description: "Personalised one-on-one yoga therapy for chronic pain, anxiety, hormonal balance and recovery — with a real health assessment and a plan built for you.",
    alternates: { canonical: "/yoga-therapy" },
};

export default function TherapyPage() {
    return (
        <main>
            <PageHeader
                title="Yoga Therapy 1:1"
                subtitle="Personalized healing journeys tailored to your unique physical and emotional needs."
            />

            <YogaTherapy />

            <section className="py-20 px-8 bg-accent/30">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="font-serif text-3xl text-primary mb-8">Conditions We Treat</h2>
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        {["Back Pain", "Sciatica", "Anxiety & Depression", "PCOS/PCOD", "Thyroid Issues", "Insomnia", "Hypertension", "Post-Natal Recovery", "Diabetes", "Menstrual Issues", "Obesity"].map((condition, index) => (
                            <span key={index} className="px-6 py-3 bg-white rounded-full shadow-sm text-text font-sans border border-primary/10">
                                {condition}
                            </span>
                        ))}
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-secondary text-left max-w-2xl mx-auto">
                        <h3 className="font-serif text-xl text-secondary mb-4">How it works</h3>
                        <ol className="list-decimal list-inside space-y-3 font-sans text-text/80">
                            <li><strong>Initial Consultation:</strong> 60-minute deep dive into your health history.</li>
                            <li><strong>Custom Plan:</strong> We design a specific sequence for you.</li>
                            <li><strong>Guided Sessions:</strong> 1:1 practice with corrections.</li>
                            <li><strong>Progress Tracking:</strong> Weekly check-ins and adjustments.</li>
                        </ol>
                    </div>

                    <div className="mt-12">
                        <Link href="/contact" className="inline-block px-8 py-3 bg-primary text-white font-sans font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors">
                            Book Your Consultation
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
