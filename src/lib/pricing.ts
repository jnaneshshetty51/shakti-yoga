import type { PlanType, Role, SubscriptionStatus } from '@prisma/client';

/**
 * Single source of truth for plan pricing and the roles/subscription state
 * each plan grants. Keep marketing pages, checkout UI and the checkout API
 * in sync by importing from here.
 */
export interface PlanConfig {
    name: string;
    /** Amount charged per billing period, in whole `currency` units. */
    amount: number;
    currency: string;
    /** Human-readable billing period, e.g. "month" or "7 days". */
    period: string;
    features: string[];
    role: Role;
    dbPlanType: PlanType;
    subscriptionStatus: SubscriptionStatus;
}

export const PLANS = {
    everyday: {
        name: 'Everyday Yoga',
        amount: 59,
        currency: 'USD',
        period: 'month',
        features: ['5 Live Classes/week', 'Community Access', 'Flexible Timings'],
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'EVERYDAY_YOGA',
        subscriptionStatus: 'ACTIVE',
    },
    therapy: {
        name: 'Yoga Therapy',
        amount: 120,
        currency: 'USD',
        period: 'month',
        features: ['4 Personal Sessions', 'Health Assessment', 'Custom Plan'],
        role: 'MEMBER_THERAPY',
        dbPlanType: 'YOGA_THERAPY',
        subscriptionStatus: 'ACTIVE',
    },
    trial: {
        name: 'Free Trial',
        amount: 0,
        currency: 'USD',
        period: '7 days',
        features: ['1 Live Class', '15-min Consult', 'Community Access'],
        role: 'TRIAL',
        dbPlanType: 'TRIAL',
        subscriptionStatus: 'TRIAL',
    },
} satisfies Record<string, PlanConfig>;

export type PlanKey = keyof typeof PLANS;

export function isPlanKey(key: string | null | undefined): key is PlanKey {
    return !!key && key in PLANS;
}

/** Resolve a plan key to its config, falling back to the Everyday plan. */
export function getPlan(key: string | null | undefined): PlanConfig {
    return isPlanKey(key) ? PLANS[key] : PLANS.everyday;
}
