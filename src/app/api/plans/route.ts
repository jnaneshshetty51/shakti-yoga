import { NextResponse } from 'next/server';
import { LADDER, priceFor, regionFor, type PlanKey, type PlanConfig } from '@/lib/pricing';
import { resolvedPlans } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * The plan ladder for the paywall. `?region=IN|INTL` (or a country / currency
 * hint) picks INR vs USD pricing; the app passes its store storefront.
 */
export async function GET(request: Request) {
    const hint = new URL(request.url).searchParams.get('region');
    const region = regionFor(hint);
    const PLANS = await resolvedPlans();

    const rung = (key: PlanKey) => {
        const p: PlanConfig = PLANS[key];
        const price = priceFor(p, region);
        return {
            key: p.key,
            name: p.name,
            tier: p.tier,
            interval: p.interval,
            price: price.amount,
            currency: price.currency,
            period: p.interval === 'annual' ? 'year' : 'month',
            features: p.features,
            recommended: !!p.recommended,
            rcProductId: p.rcProductId,
            weeklyClassLimit: p.weeklyClassLimit,
        };
    };

    return NextResponse.json(
        {
            region,
            trial: {
                key: 'trial',
                name: PLANS.trial.name,
                price: 0,
                currency: priceFor(PLANS.trial, region).currency,
                period: '7 days',
                features: PLANS.trial.features,
            },
            plans: LADDER.map(rung),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
