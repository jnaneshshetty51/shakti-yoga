import type { PlanType, Role, SubscriptionStatus } from '@prisma/client';

/**
 * Single source of truth for plan pricing and the roles/subscription state
 * each plan grants. Keep marketing pages, checkout UI and the checkout API
 * in sync by importing from here.
 */
export interface PlanConfig {
    name: string;
    /** Amount charged per billing period, in whole `currency` units (rupees). */
    amount: number;
    currency: string;
    /** Human-readable billing period, e.g. "month" or "7 days". */
    period: string;
    /** How many days of access one activation grants (renewal/expiry window). */
    renewalDays: number;
    features: string[];
    role: Role;
    dbPlanType: PlanType;
    subscriptionStatus: SubscriptionStatus;
    /** 1:1 therapy session credits granted when this plan activates. */
    credits: number;
}

export const CURRENCY = 'INR';

export const PLANS = {
    everyday: {
        name: 'Everyday Yoga',
        amount: 2000,
        currency: CURRENCY,
        period: 'month',
        renewalDays: 30,
        features: ['5 Live Classes/week', 'Community Access', 'Flexible Timings'],
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'EVERYDAY_YOGA',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
    },
    therapy: {
        name: 'Yoga Therapy',
        amount: 5000,
        currency: CURRENCY,
        period: 'month',
        renewalDays: 30,
        features: ['4 Personal 1:1 Sessions', 'Health Assessment', 'Custom Plan'],
        role: 'MEMBER_THERAPY',
        dbPlanType: 'YOGA_THERAPY',
        subscriptionStatus: 'ACTIVE',
        credits: 4,
    },
    trial: {
        name: 'Free Trial',
        amount: 0,
        currency: CURRENCY,
        period: '7 days',
        renewalDays: 7,
        features: ['1 Live Class', '15-min Consult', 'Community Access'],
        role: 'TRIAL',
        dbPlanType: 'TRIAL',
        subscriptionStatus: 'TRIAL',
        credits: 1,
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

/** Format an amount for display, e.g. formatPrice(2000) -> "₹2,000". */
export function formatPrice(amount: number, currency: string = CURRENCY): string {
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency} ${amount}`;
    }
}
