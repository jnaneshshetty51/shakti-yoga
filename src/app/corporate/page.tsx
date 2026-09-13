import PageHeader from "@/components/PageHeader";
import { getCorporatePageContent } from "@/lib/cms";
import CorporateForm from "./CorporateForm";

export const revalidate = 60;

const PROGRAMS = [
    {
        title: "Desk Ergonomics & Spinal Reset",
        badge: "Most Popular",
        desc: "30-minute virtual micro-sessions designed for seated knowledge workers. Relieves neck stiffness, frozen shoulders, and lower back fatigue without changing into gym clothes.",
        bullets: [
            "Chair-based alignment and thoracic expansion",
            "Screen fatigue & eye-strain relaxation techniques",
            "Zero sweat, high-rejuvenation format",
        ],
    },
    {
        title: "Executive Stress Resilience & Breathwork",
        badge: "Leadership & High-Impact",
        desc: "Pranayama mastery and nervous system down-regulation to calm sympathetic stress, improve sleep quality, and sustain executive decision-making clarity.",
        bullets: [
            "Physiological sigh and vagus nerve reset methods",
            "Pre-meeting focus & energy balancing techniques",
            "Guided 15-minute midday nervous system resets",
        ],
    },
    {
        title: "All-Access Distributed Team Subscriptions",
        badge: "Global Teams",
        desc: "Provide your distributed workforce across US, Europe, and Asia with unlimited access to our daily live classes and guided therapy sessions.",
        bullets: [
            "Multiple time-zone slots (IST, EST, PST, GMT)",
            "Dedicated company batch options available",
            "Monthly attendance & engagement reports for HR",
        ],
    },
];

export default async function CorporatePage() {
    const cms = await getCorporatePageContent();

    const metrics = [
        { stat: cms.metric_1_stat, label: cms.metric_1_label },
        { stat: cms.metric_2_stat, label: cms.metric_2_label },
        { stat: cms.metric_3_stat, label: cms.metric_3_label },
    ];

    return (
        <main className="bg-background min-h-screen">
            <PageHeader
                title={cms.title}
                subtitle={cms.subtitle}
            />

            {/* Value Metrics Section */}
            <section className="py-12 sm:py-16 px-4 sm:px-8 bg-white border-b border-primary/10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center">
                    {metrics.map((m, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-accent/20 border border-primary/5">
                            <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-2">{m.stat}</p>
                            <p className="font-sans text-xs sm:text-sm text-text/80 leading-relaxed max-w-xs mx-auto">
                                {m.label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Program Formats */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Tailored For Organizations</span>
                    <h2 className="font-serif text-3xl sm:text-4xl text-primary">Flexible Wellness Formats for Your Team</h2>
                    <p className="text-text/70 text-sm sm:text-base mt-3">
                        Whether you are looking for a high-impact team workshop or ongoing daily memberships, we build packages that match your team&apos;s rhythm.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {PROGRAMS.map((p, i) => (
                        <div key={i} className="bg-white rounded-3xl p-8 border border-primary/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold uppercase tracking-widest mb-4">
                                    {p.badge}
                                </span>
                                <h3 className="font-serif text-2xl text-text mb-3">{p.title}</h3>
                                <p className="font-sans text-xs sm:text-sm text-text/70 leading-relaxed mb-6">
                                    {p.desc}
                                </p>
                                <ul className="space-y-2.5 font-sans text-xs sm:text-sm text-text/80 mb-8">
                                    {p.bullets.map((b, bi) => (
                                        <li key={bi} className="flex items-start gap-2">
                                            <span className="text-secondary mt-0.5">✦</span>
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <a
                                href="#enquiry"
                                className="block w-full py-3 text-center border-2 border-primary text-primary font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-primary hover:text-white transition-colors"
                            >
                                Inquire for This Program →
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* Enterprise Benefits */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 bg-accent/30">
                <div className="max-w-5xl mx-auto">
                    <h2 className="font-serif text-3xl text-primary text-center mb-12">Why People Leaders Choose Shakti Yoga</h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {[
                            { title: "No Fluff, Real Lineage Yoga", desc: "Authentic Indian master teachers who observe participant feeds and provide safe, anatomical corrections." },
                            { title: "Multi-Timezone Support", desc: "Live sessions coordinated to suit North American, European, and Asia-Pacific working windows." },
                            { title: "Turnkey Implementation", desc: "We provide calendar invites, Google Meet links, promotional flyers, and monthly attendance tracking." },
                            { title: "Complimentary 45-Min Pilot", desc: "Experience our teaching firsthand with an interactive pilot session before committing to an annual plan." },
                        ].map((b, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                                <h4 className="font-serif font-bold text-lg text-text mb-2 flex items-center gap-2">
                                    <span className="text-primary">🌿</span> {b.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-text/70 font-sans leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Corporate Enquiry Form */}
            <CorporateForm />
        </main>
    );
}
