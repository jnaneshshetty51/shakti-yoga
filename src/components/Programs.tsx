import Link from 'next/link';
import { priceFor, formatPrice, type PlanConfig } from '@/lib/pricing';
import { resolvedPlans } from '@/lib/plans';
import { resolveRegion } from '@/lib/region';
import CurrencyToggle from '@/components/CurrencyToggle';

const CHECK = (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 flex-none">
        <circle cx="10" cy="10" r="10" className="fill-primary/10" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#4A6741" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default async function Programs() {
    const [region, PLANS] = await Promise.all([resolveRegion(), resolvedPlans()]);
    const everyday = PLANS.everyday;
    const therapy = PLANS.therapy;
    const priceLabel = (p: PlanConfig) => formatPrice(priceFor(p, region).amount, priceFor(p, region).currency);

    return (
        <section id="programs" className="bg-accent/40 px-4 py-16 sm:px-8 sm:py-24">
            <div className="mx-auto max-w-5xl">
                <div className="mb-4 text-center">
                    <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-secondary">Membership</p>
                    <h2 className="mt-2 font-serif text-3xl text-primary sm:text-4xl md:text-[2.75rem]">Choose your path</h2>
                    <p className="mx-auto mt-3 max-w-lg font-sans text-text/70">
                        Daily group energy, or personalised one-on-one healing. Start either with a free week.
                    </p>
                </div>

                <div className="mb-10 flex justify-center">
                    <CurrencyToggle region={region} />
                </div>

                <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
                    {/* Everyday Yoga */}
                    <div className="relative flex flex-col rounded-3xl border border-secondary/30 bg-white p-7 shadow-[0_2px_20px_rgba(44,62,50,0.06)] sm:p-8">
                        {everyday.recommended !== false && (
                            <span className="absolute -top-3 left-7 rounded-full bg-secondary px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-widest text-white">
                                Most popular
                            </span>
                        )}
                        <h3 className="font-serif text-2xl text-text">{everyday.name}</h3>
                        <p className="mt-1 font-sans text-xs uppercase tracking-[0.15em] text-text/50">Unlimited group classes</p>
                        <p className="mt-5 font-serif text-4xl text-primary">
                            {priceLabel(everyday)}
                            <span className="font-sans text-base text-text/45"> / month</span>
                        </p>
                        <ul className="mt-6 flex-1 space-y-3 font-sans text-[15px] text-text/80">
                            {everyday.features.map((f) => (
                                <li key={f} className="flex gap-3">{CHECK}<span>{f}</span></li>
                            ))}
                        </ul>
                        <Link
                            href="/trial"
                            className="mt-7 block rounded-full bg-primary py-3.5 text-center font-sans text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-primary/90"
                        >
                            Start free trial
                        </Link>
                        <p className="mt-3 text-center font-sans text-xs text-text/50">7 days free · no card required</p>
                    </div>

                    {/* Yoga Therapy */}
                    <div className="flex flex-col rounded-3xl border border-primary/20 bg-white p-7 shadow-[0_2px_20px_rgba(44,62,50,0.06)] sm:p-8">
                        <h3 className="font-serif text-2xl text-text">{therapy.name}</h3>
                        <p className="mt-1 font-sans text-xs uppercase tracking-[0.15em] text-text/50">1:1 personalised</p>
                        <p className="mt-5 font-serif text-4xl text-primary">
                            {priceLabel(therapy)}
                            <span className="font-sans text-base text-text/45"> / month</span>
                        </p>
                        <ul className="mt-6 flex-1 space-y-3 font-sans text-[15px] text-text/80">
                            {therapy.features.map((f) => (
                                <li key={f} className="flex gap-3">{CHECK}<span>{f}</span></li>
                            ))}
                        </ul>
                        <Link
                            href="/yoga-therapy/start"
                            className="mt-7 block rounded-full border-2 border-primary py-3 text-center font-sans text-sm font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white"
                        >
                            Book a consultation
                        </Link>
                        <p className="mt-3 text-center font-sans text-xs text-text/50">Talk to us before you decide</p>
                    </div>
                </div>

                <p className="mt-8 text-center font-sans text-sm text-text/60">
                    Also on the <Link href="/programs" className="font-semibold text-primary underline underline-offset-2">full plans page</Link>: Starter, Family, and annual pricing (two months free).
                </p>
            </div>
        </section>
    );
}
