import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import type { Metadata } from "next";
import { priceFor, formatPrice, type PlanKey } from "@/lib/pricing";
import { resolvedPlans } from "@/lib/plans";
import { resolveRegion } from "@/lib/region";
import CurrencyToggle from "@/components/CurrencyToggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Programs & Pricing",
    description:
        "Starter, Everyday Yoga (unlimited live classes) and 1:1 Yoga Therapy. Monthly or annual, priced in ₹ for India and $ for everyone else. 7-day free trial.",
    alternates: { canonical: "/programs" },
};

const CHECK = (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 flex-none">
        <circle cx="10" cy="10" r="10" className="fill-primary/10" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#4A6741" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TIERS: { key: PlanKey; annualKey?: PlanKey; blurb: string; cta: string; href: string }[] = [
    { key: "starter", blurb: "Build the habit with a couple of classes a week.", cta: "Start free trial", href: "/trial" },
    { key: "everyday", annualKey: "everyday_annual", blurb: "Unlimited daily classes and the full library.", cta: "Start free trial", href: "/trial" },
    { key: "family", annualKey: "family_annual", blurb: "Two members, unlimited classes each.", cta: "Start free trial", href: "/trial" },
    { key: "therapy", annualKey: "therapy_annual", blurb: "Private 1:1 sessions for specific health goals.", cta: "Book a consultation", href: "/yoga-therapy/start" },
];

export default async function ProgramsPage() {
    const [region, PLANS] = await Promise.all([resolveRegion(), resolvedPlans()]);
    const price = (k: PlanKey) => {
        const p = priceFor(PLANS[k], region);
        return formatPrice(p.amount, p.currency);
    };

    return (
        <main>
            <PageHeader
                title="Programs & pricing"
                subtitle="From building a daily habit to deep 1:1 healing. Every plan starts with a free week."
            />

            <section className="bg-background px-4 py-14 sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 flex flex-col items-center gap-3">
                        <CurrencyToggle region={region} />
                        <p className="font-sans text-xs text-text/50">
                            {region === "IN" ? "Prices in Indian rupees." : "Prices in US dollars for members outside India."}
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {TIERS.map(({ key, annualKey, blurb, cta, href }) => {
                            const plan = PLANS[key];
                            const featured = key === "everyday";
                            return (
                                <div
                                    key={key}
                                    className={`relative flex flex-col rounded-3xl bg-white p-6 shadow-[0_2px_20px_rgba(44,62,50,0.06)] ${
                                        featured ? "border-2 border-primary" : "border border-primary/15"
                                    }`}
                                >
                                    {featured && plan.recommended !== false && (
                                        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-widest text-white">
                                            Most popular
                                        </span>
                                    )}
                                    <h3 className="font-serif text-xl text-text">{plan.name}</h3>
                                    <p className="mt-1 min-h-[40px] font-sans text-sm text-text/60">{blurb}</p>
                                    <p className="mt-4 font-serif text-3xl text-primary">
                                        {price(key)}
                                        <span className="font-sans text-sm text-text/45"> / mo</span>
                                    </p>
                                    {annualKey && (
                                        <p className="mt-1 font-sans text-xs text-text/50">
                                            or {price(annualKey)}/yr — 2 months free
                                        </p>
                                    )}
                                    <ul className="mt-5 flex-1 space-y-2.5 font-sans text-sm text-text/80">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex gap-2.5">{CHECK}<span>{f}</span></li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={href}
                                        className={`mt-6 block rounded-full py-3 text-center font-sans text-xs font-bold uppercase tracking-widest transition-colors ${
                                            featured
                                                ? "bg-primary text-white hover:bg-primary/90"
                                                : "border-2 border-primary text-primary hover:bg-primary hover:text-white"
                                        }`}
                                    >
                                        {cta}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    <p className="mt-8 text-center font-sans text-sm text-text/60">
                        All plans: 7-day free trial, cancel anytime, no card required to start.
                    </p>
                </div>
            </section>

            {/* Comparison */}
            <section className="bg-accent/30 px-4 py-16 sm:px-8">
                <div className="mx-auto max-w-4xl">
                    <h2 className="mb-10 text-center font-serif text-3xl text-primary">Everyday Yoga vs Yoga Therapy</h2>
                    <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white">
                        <div className="grid grid-cols-3 bg-primary p-5 font-serif text-base font-bold text-white sm:text-lg">
                            <div>Feature</div>
                            <div className="text-center">Everyday</div>
                            <div className="text-center">Therapy</div>
                        </div>
                        <div className="divide-y divide-primary/10 font-sans text-sm text-text/80">
                            {[
                                ["Format", "Live group classes", "1:1 private sessions"],
                                ["Focus", "Fitness, flexibility, calm", "Specific healing & recovery"],
                                ["Attention", "Group corrections", "100% personalised"],
                                ["Who it's for", "Beginner to advanced", "Managing a health condition"],
                                ["Price", `${price("everyday")} / mo`, `${price("therapy")} / mo`],
                            ].map(([f, a, b], i) => (
                                <div key={f} className={`grid grid-cols-3 p-5 ${i === 4 ? "bg-accent/20 font-bold" : ""}`}>
                                    <div className="font-semibold text-primary">{f}</div>
                                    <div className="text-center">{a}</div>
                                    <div className="text-center">{b}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Included */}
            <section className="bg-background px-4 py-16 sm:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="mb-10 font-serif text-3xl text-primary">In every plan</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        {[
                            ["Community", "A WhatsApp group for daily class links, reminders and encouragement."],
                            ["Teacher support", "Real teachers who know your name and answer your questions."],
                            ["Practice library", "Guided practices, breathwork and challenges for the days between classes."],
                        ].map(([h, p]) => (
                            <div key={h} className="rounded-2xl border border-primary/10 bg-white p-6 text-left">
                                <h3 className="font-serif text-lg text-text">{h}</h3>
                                <p className="mt-2 font-sans text-sm text-text/70">{p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
