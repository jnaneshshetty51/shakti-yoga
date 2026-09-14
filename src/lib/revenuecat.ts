import { prisma } from '@/lib/prisma';
import { activatePlan, SubscriptionProviderConflictError } from '@/lib/subscription';
import { planByProductId, regionFor } from '@/lib/pricing';
import { recordEvent, recordRevenue } from '@/lib/analytics';
import { posthogCapture, posthogIdentify } from '@/lib/posthog';
import { markReferralConverted } from '@/lib/referral';
import { Role, SubscriptionStatus } from '@prisma/client';

/**
 * RevenueCat webhook handling. RevenueCat is the source of truth for App Store /
 * Play Store subscriptions; its events map onto the same `Subscription` row the
 * app already checks, so entitlement checks stay in one place.
 *
 * The mobile app calls Purchases.logIn(<our user id>), so `app_user_id` on the
 * event is our user id.
 */

export interface RcEvent {
    /** RevenueCat's per-event UUID — the idempotency key (see webhooks/revenuecat/route.ts). */
    id?: string;
    type: string;
    app_user_id: string;
    original_app_user_id?: string;
    product_id?: string;
    entitlement_ids?: string[] | null;
    period_type?: string; // NORMAL | TRIAL | INTRO
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    store?: string; // APP_STORE | PLAY_STORE | STRIPE | ...
    environment?: string; // SANDBOX | PRODUCTION
    country_code?: string | null;
    price?: number | null;
    currency?: string | null;
    original_transaction_id?: string | null;
    transaction_id?: string | null;
}

const GRANT_TYPES = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'PRODUCT_CHANGE',
    'UNCANCELLATION',
    'NON_RENEWING_PURCHASE',
]);

async function downgrade(userId: string, status: SubscriptionStatus): Promise<void> {
    const sub = await prisma.subscription.findUnique({ where: { userId }, select: { id: true } });
    await prisma.$transaction([
        ...(sub ? [prisma.subscription.update({ where: { userId }, data: { status } })] : []),
        prisma.user.update({ where: { id: userId }, data: { role: Role.VISITOR } }),
    ]);
}

/** Apply one RevenueCat event. Returns a short status string for the webhook log. */
export async function applyRcEvent(e: RcEvent): Promise<string> {
    const userId = e.app_user_id;
    if (!userId) return 'no app_user_id';

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return 'unknown user';

    const store = e.store === 'PLAY_STORE' ? ('play_store' as const) : ('app_store' as const);
    const provider = store === 'play_store' ? ('google' as const) : ('apple' as const);
    const region = regionFor(e.country_code ?? undefined);

    if (e.type === 'CANCELLATION') {
        // Still entitled until expiry — flip to CANCELLED so syncSubscriptionState
        // drops the role when renewalDate passes.
        await prisma.subscription.updateMany({
            where: { userId, provider: { in: ['apple', 'google'] } },
            data: { status: SubscriptionStatus.CANCELLED, recurring: false },
        });
        recordEvent('subscription_cancelled', { userId, metadata: { store, reason: 'user' } });
        return 'cancelled (grace)';
    }

    if (e.type === 'EXPIRATION' || e.type === 'SUBSCRIPTION_PAUSED') {
        await downgrade(userId, SubscriptionStatus.EXPIRED);
        recordEvent('subscription_cancelled', { userId, metadata: { store, reason: e.type.toLowerCase() } });
        return 'expired';
    }

    if (e.type === 'BILLING_ISSUE') {
        await prisma.subscription.updateMany({
            where: { userId, provider: { in: ['apple', 'google'] } },
            data: { status: SubscriptionStatus.PAUSED },
        });
        return 'billing issue';
    }

    if (!GRANT_TYPES.has(e.type)) return `ignored (${e.type})`;

    const plan = e.product_id ? planByProductId(e.product_id) : null;
    if (!plan) return `unknown product ${e.product_id}`;

    const renewalDate = e.expiration_at_ms
        ? new Date(e.expiration_at_ms)
        : (() => {
              const d = new Date();
              d.setDate(d.getDate() + plan.renewalDays);
              return d;
          })();

    const first = e.type === 'INITIAL_PURCHASE';
    let mappedRole: string;
    try {
        ({ mappedRole } = await activatePlan(userId, plan, {
            recurring: e.type !== 'NON_RENEWING_PURCHASE',
            subscriptionId: e.original_transaction_id ?? e.transaction_id ?? undefined,
            renewalDate,
            region,
            provider,
            store,
            ...(typeof e.price === 'number' && e.currency ? { amount: e.price, currency: e.currency } : {}),
        }));
    } catch (err) {
        if (err instanceof SubscriptionProviderConflictError) {
            // The App/Play Store has already charged the member — this only
            // refuses to overwrite their other live subscription's billing id.
            // Needs a human to reconcile (likely a refund on one side).
            console.error(`[revenuecat] provider conflict for user ${userId}: ${err.message}`);
            return `provider conflict — not applied (${err.existingProvider})`;
        }
        throw err;
    }

    recordEvent(first ? 'subscription_started' : 'subscription_renewed', {
        userId,
        metadata: { plan: plan.key, store, environment: e.environment },
    });
    posthogCapture(userId, first ? 'subscription_started' : 'subscription_renewed', {
        plan: plan.key, billing: provider, amount: e.price ?? plan.inr,
    });
    posthogIdentify(userId, { plan: plan.key, role: mappedRole, billing: provider });

    if (typeof e.price === 'number' && e.currency && e.period_type !== 'TRIAL') {
        recordRevenue({
            userId, amount: e.price, currency: e.currency,
            planType: plan.dbPlanType, provider, providerId: e.transaction_id ?? undefined,
        });
    }
    if (first && e.period_type !== 'TRIAL') void markReferralConverted(userId, plan.dbPlanType).catch(() => {});

    return `granted ${plan.key}`;
}
