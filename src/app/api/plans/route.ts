import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/pricing';

export const revalidate = 300;

/** Fallback derived from the single source of truth in lib/pricing. */
const FALLBACK = {
    everyday: {
        name: PLANS.everyday.name,
        price: PLANS.everyday.amount,
        currency: PLANS.everyday.currency,
        period: PLANS.everyday.period,
        features: PLANS.everyday.features,
    },
    therapy: {
        name: PLANS.therapy.name,
        price: PLANS.therapy.amount,
        currency: PLANS.therapy.currency,
        period: PLANS.therapy.period,
        features: PLANS.therapy.features,
    },
    trial: {
        name: PLANS.trial.name,
        price: PLANS.trial.amount,
        currency: PLANS.trial.currency,
        period: PLANS.trial.period,
        features: PLANS.trial.features,
    },
};

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { sortOrder: 'asc' },
        });

        if (plans.length === 0) return NextResponse.json(FALLBACK);

        const KEY: Record<string, string> = { EVERYDAY_YOGA: 'everyday', YOGA_THERAPY: 'therapy', TRIAL: 'trial' };
        const grouped = plans.reduce((acc, plan) => {
            const key = KEY[plan.planType] ?? plan.planType.toLowerCase();
            acc[key] = {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                period: plan.period,
                features: plan.features,
                description: plan.description,
            };
            return acc;
        }, {} as Record<string, unknown>);

        return NextResponse.json(Object.keys(grouped).length > 0 ? grouped : FALLBACK);
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json(FALLBACK);
    }
}
