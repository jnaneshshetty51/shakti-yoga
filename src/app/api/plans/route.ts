import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback plans for when DB is unavailable
const FALLBACK_PLANS = {
    everyday: {
        name: "Everyday Yoga",
        price: 4900,
        period: "month",
        features: ["5 Live Classes/week", "Community Access", "Flexible Timings"]
    },
    therapy: {
        name: "Yoga Therapy",
        price: 9900,
        period: "month",
        features: ["4 Personal Sessions", "Health Assessment", "Custom Plan"]
    },
    trial: {
        name: "Free Trial",
        price: 0,
        period: "7 days",
        features: ["1 Live Class", "15-min Consult", "Community Access"]
    }
};

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { sortOrder: 'asc' }
        });

        if (plans.length === 0) {
            return NextResponse.json(FALLBACK_PLANS);
        }

        // Group plans by planType
        const groupedPlans = plans.reduce((acc, plan) => {
            const key = plan.planType.toLowerCase().replace('_', '');
            acc[key] = {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                period: plan.period,
                features: plan.features,
                description: plan.description
            };
            return acc;
        }, {} as Record<string, { id: string; name: string; price: number; currency: string; period: string; features: string[]; description: string | null }>);

        return NextResponse.json(Object.keys(groupedPlans).length > 0 ? groupedPlans : FALLBACK_PLANS);
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json(FALLBACK_PLANS);
    }
}