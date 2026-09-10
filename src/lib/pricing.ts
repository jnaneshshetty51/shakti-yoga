import type { PlanType, Role, SubscriptionStatus } from '@prisma/client';

/**
 * Single source of truth for the plan ladder: prices (INR + USD), billing
 * interval, the role / entitlements each plan grants, and the store / RevenueCat
 * product identifier. Marketing pages, the paywall, checkout and the RevenueCat
 * webhook all import from here.
 */

export type Region = 'IN' | 'INTL';
export type PlanTier = 'trial' | 'starter' | 'everyday' | 'therapy' | 'family';
export type BillingInterval = 'monthly' | 'annual' | 'trial';

export interface PlanConfig {
    /** Stable key used in URLs, checkout payloads and RevenueCat metadata. */
    key: string;
    name: string;
    tier: PlanTier;
    interval: BillingInterval;
    /** Price in whole rupees. */
    inr: number;
    /** Price in whole US dollars (NRI / international storefronts). */
    usd: number;
    /** Days of access one activation grants. */
    renewalDays: number;
    role: Role;
    dbPlanType: PlanType;
    subscriptionStatus: SubscriptionStatus;
    /** 1:1 therapy credits granted on activation. */
    credits: number;
    /**
     * Group-class sessions granted per billing cycle, consumed on
     * teacher-confirmed attendance (see lib/sessionCredits). `null` = uncapped —
     * no ledger, no "N/20 remaining" (annual plans, Starter, Therapy).
     */
    sessionsPerCycle: number | null;
    /** Live group classes per week; null = unlimited. */
    weeklyClassLimit: number | null;
    /** Extra member seats beyond the owner (family plans). */
    extraSeats: number;
    features: string[];
    /** App Store / Play / RevenueCat product identifier. */
    rcProductId: string;
    recommended?: boolean;
}

export const CURRENCY = 'INR';

export const PLANS = {
    trial: {
        key: 'trial',
        name: 'Free Trial',
        tier: 'trial',
        interval: 'trial',
        inr: 0,
        usd: 0,
        renewalDays: 7,
        role: 'TRIAL',
        dbPlanType: 'TRIAL',
        subscriptionStatus: 'TRIAL',
        credits: 1,
        sessionsPerCycle: null,
        weeklyClassLimit: null,
        extraSeats: 0,
        features: ['1 live class', '15-min consult', 'Full content library', 'Community access'],
        rcProductId: '',
    },
    starter: {
        key: 'starter',
        name: 'Starter',
        tier: 'starter',
        interval: 'monthly',
        inr: 699,
        usd: 14,
        renewalDays: 30,
        role: 'MEMBER_STARTER',
        dbPlanType: 'STARTER',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
        sessionsPerCycle: null, // Starter stays on a rolling weekly limit, not the cycle ledger
        weeklyClassLimit: 2,
        extraSeats: 0,
        features: ['2 live classes / week', 'Full practice library', 'Challenges & community'],
        rcProductId: 'sy_starter_monthly',
    },
    everyday: {
        key: 'everyday',
        name: 'Everyday Yoga',
        tier: 'everyday',
        interval: 'monthly',
        inr: 2000,
        usd: 59,
        renewalDays: 30,
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'EVERYDAY_YOGA',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
        sessionsPerCycle: 20,
        weeklyClassLimit: null,
        extraSeats: 0,
        features: ['20 live classes / cycle', 'All content & practices', 'Challenges & community'],
        rcProductId: 'sy_everyday_monthly',
    },
    everyday_annual: {
        key: 'everyday_annual',
        name: 'Everyday Yoga · Annual',
        tier: 'everyday',
        interval: 'annual',
        inr: 11988,
        usd: 249,
        renewalDays: 365,
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'EVERYDAY_YOGA',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
        sessionsPerCycle: null, // annual = uncapped live classes (per product decision 2026-09-10)
        weeklyClassLimit: null,
        extraSeats: 0,
        features: ['Unlimited live classes', 'Two months free', 'Locked-in price for a year'],
        rcProductId: 'sy_everyday_annual',
        recommended: true,
    },
    therapy: {
        key: 'therapy',
        name: 'Yoga Therapy',
        tier: 'therapy',
        interval: 'monthly',
        inr: 4999,
        usd: 89,
        renewalDays: 30,
        role: 'MEMBER_THERAPY',
        dbPlanType: 'YOGA_THERAPY',
        subscriptionStatus: 'ACTIVE',
        credits: 4,
        sessionsPerCycle: null,
        weeklyClassLimit: null,
        extraSeats: 0,
        features: ['4 personal 1:1 sessions / month', 'Everyday Yoga included', 'Health assessment + plan'],
        rcProductId: 'sy_therapy_monthly',
    },
    therapy_annual: {
        key: 'therapy_annual',
        name: 'Yoga Therapy · Annual',
        tier: 'therapy',
        interval: 'annual',
        inr: 44988,
        usd: 799,
        renewalDays: 365,
        role: 'MEMBER_THERAPY',
        dbPlanType: 'YOGA_THERAPY',
        subscriptionStatus: 'ACTIVE',
        credits: 48, // 4 sessions/month across the annual term (was 4 — under-granted a full year)
        sessionsPerCycle: null,
        weeklyClassLimit: null,
        extraSeats: 0,
        features: ['Everything in Therapy', 'Two months free', '48 sessions a year'],
        rcProductId: 'sy_therapy_annual',
    },
    family: {
        key: 'family',
        name: 'Family',
        tier: 'family',
        interval: 'monthly',
        inr: 2199,
        usd: 45,
        renewalDays: 30,
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'FAMILY',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
        sessionsPerCycle: 20, // per member seat
        weeklyClassLimit: null,
        extraSeats: 1,
        features: ['Two members', '20 live classes / cycle each', 'All content & community'],
        rcProductId: 'sy_family_monthly',
    },
    family_annual: {
        key: 'family_annual',
        name: 'Family · Annual',
        tier: 'family',
        interval: 'annual',
        inr: 19188,
        usd: 399,
        renewalDays: 365,
        role: 'MEMBER_EVERYDAY',
        dbPlanType: 'FAMILY',
        subscriptionStatus: 'ACTIVE',
        credits: 0,
        sessionsPerCycle: null, // annual = uncapped
        weeklyClassLimit: null,
        extraSeats: 1,
        features: ['Everything in Family', 'Two months free'],
        rcProductId: 'sy_family_annual',
    },
} satisfies Record<string, PlanConfig>;

export type PlanKey = keyof typeof PLANS;

/** The paywall order (trial is handled separately). */
export const LADDER: PlanKey[] = [
    'starter', 'everyday', 'everyday_annual', 'family', 'family_annual', 'therapy', 'therapy_annual',
];

export function isPlanKey(key: string | null | undefined): key is PlanKey {
    return !!key && key in PLANS;
}

export function getPlan(key: string | null | undefined): PlanConfig {
    return isPlanKey(key) ? PLANS[key] : PLANS.everyday;
}

/** Look up a plan by its RevenueCat / store product id. */
export function planByProductId(productId: string): PlanConfig | null {
    const id = productId.trim();
    return (Object.values(PLANS) as PlanConfig[]).find((p) => p.rcProductId && p.rcProductId === id) ?? null;
}

/** Amount + currency for a plan in a region. */
export function priceFor(plan: PlanConfig, region: Region): { amount: number; currency: string } {
    return region === 'INTL'
        ? { amount: plan.usd, currency: 'USD' }
        : { amount: plan.inr, currency: 'INR' };
}

/** Map a country / storefront hint to a pricing region. */
export function regionFor(hint: string | null | undefined): Region {
    const h = (hint || '').trim().toUpperCase();
    if (!h || h === 'IN' || h === 'INDIA' || h === 'INR') return 'IN';
    return 'INTL';
}

export function formatPrice(amount: number, currency: string = CURRENCY): string {
    try {
        return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency} ${amount}`;
    }
}
