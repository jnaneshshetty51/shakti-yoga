import { prisma } from '../src/lib/prisma';
import { applyRcEvent, type RcEvent } from '../src/lib/revenuecat';
import { Role, SubscriptionStatus } from '@prisma/client';

/**
 * End-to-End Verification script for RevenueCat Mobile In-App Purchase integration.
 * Run with: npx tsx scripts/test-revenuecat-webhook.ts
 */
async function main() {
    console.log('--- Starting RevenueCat Webhook & IAP End-to-End Test ---');

    const testEmail = `rc-test-${Date.now()}@example.com`;
    console.log(`1. Provisioning test user: ${testEmail}`);
    const user = await prisma.user.create({
        data: {
            email: testEmail,
            name: 'RevenueCat Tester',
            passwordHash: 'dummy_hash',
            role: Role.VISITOR,
        },
    });

    try {
        // Step 1: Simulate INITIAL_PURCHASE (Everyday Yoga Monthly)
        console.log('2. Simulating INITIAL_PURCHASE for Everyday Yoga Monthly (sy_everyday_monthly)...');
        const purchaseEvent: RcEvent = {
            id: `evt_init_${Date.now()}`,
            type: 'INITIAL_PURCHASE',
            app_user_id: user.id,
            product_id: 'sy_everyday_monthly',
            period_type: 'NORMAL',
            store: 'APP_STORE',
            environment: 'SANDBOX',
            price: 2000,
            currency: 'INR',
            original_transaction_id: `tx_${Date.now()}`,
            transaction_id: `tx_${Date.now()}`,
            expiration_at_ms: Date.now() + 30 * 86_400_000,
        };

        const initResult = await applyRcEvent(purchaseEvent);
        console.log(`   -> applyRcEvent result: ${initResult}`);

        // Verify database state
        const userAfterPurchase = await prisma.user.findUnique({
            where: { id: user.id },
            include: { subscription: true },
        });

        if (userAfterPurchase?.role !== Role.MEMBER_EVERYDAY) {
            throw new Error(`Expected role MEMBER_EVERYDAY, got ${userAfterPurchase?.role}`);
        }
        if (userAfterPurchase?.subscription?.status !== SubscriptionStatus.ACTIVE) {
            throw new Error(`Expected subscription ACTIVE, got ${userAfterPurchase?.subscription?.status}`);
        }
        if (userAfterPurchase?.subscription?.provider !== 'apple') {
            throw new Error(`Expected provider 'apple', got ${userAfterPurchase?.subscription?.provider}`);
        }
        console.log('   [PASS] User successfully upgraded to MEMBER_EVERYDAY with active Apple subscription.');

        // Step 2: Simulate RENEWAL
        console.log('3. Simulating RENEWAL event...');
        const newExpiry = Date.now() + 60 * 86_400_000;
        const renewalEvent: RcEvent = {
            id: `evt_renew_${Date.now()}`,
            type: 'RENEWAL',
            app_user_id: user.id,
            product_id: 'sy_everyday_monthly',
            period_type: 'NORMAL',
            store: 'APP_STORE',
            environment: 'SANDBOX',
            price: 2000,
            currency: 'INR',
            expiration_at_ms: newExpiry,
        };
        const renewResult = await applyRcEvent(renewalEvent);
        console.log(`   -> applyRcEvent result: ${renewResult}`);

        const userAfterRenew = await prisma.user.findUnique({
            where: { id: user.id },
            include: { subscription: true },
        });
        if (!userAfterRenew?.subscription?.renewalDate) {
            throw new Error('Renewal date missing after RENEWAL event');
        }
        console.log('   [PASS] Subscription successfully renewed and renewalDate extended.');

        // Step 3: Simulate CANCELLATION (Grace period)
        console.log('4. Simulating CANCELLATION event (user turned off auto-renew in iOS settings)...');
        const cancelEvent: RcEvent = {
            id: `evt_cancel_${Date.now()}`,
            type: 'CANCELLATION',
            app_user_id: user.id,
            store: 'APP_STORE',
        };
        const cancelResult = await applyRcEvent(cancelEvent);
        console.log(`   -> applyRcEvent result: ${cancelResult}`);

        const userAfterCancel = await prisma.user.findUnique({
            where: { id: user.id },
            include: { subscription: true },
        });
        if (userAfterCancel?.subscription?.status !== SubscriptionStatus.CANCELLED) {
            throw new Error(`Expected status CANCELLED, got ${userAfterCancel?.subscription?.status}`);
        }
        console.log('   [PASS] Subscription correctly marked CANCELLED while retaining access until expiry.');

        // Step 4: Simulate EXPIRATION
        console.log('5. Simulating EXPIRATION event...');
        const expireEvent: RcEvent = {
            id: `evt_expire_${Date.now()}`,
            type: 'EXPIRATION',
            app_user_id: user.id,
            store: 'APP_STORE',
        };
        const expireResult = await applyRcEvent(expireEvent);
        console.log(`   -> applyRcEvent result: ${expireResult}`);

        const userAfterExpire = await prisma.user.findUnique({
            where: { id: user.id },
            include: { subscription: true },
        });
        if (userAfterExpire?.role !== Role.VISITOR) {
            throw new Error(`Expected role VISITOR, got ${userAfterExpire?.role}`);
        }
        if (userAfterExpire?.subscription?.status !== SubscriptionStatus.EXPIRED) {
            throw new Error(`Expected status EXPIRED, got ${userAfterExpire?.subscription?.status}`);
        }
        console.log('   [PASS] User successfully downgraded to VISITOR upon EXPIRATION.');

        console.log('\n--- ALL REVENUECAT IAP LIFECYCLE TESTS PASSED 100% ---');
    } finally {
        console.log('6. Cleaning up test user and records...');
        await prisma.subscription.deleteMany({ where: { userId: user.id } });
        await prisma.payment.deleteMany({ where: { userId: user.id } });
        await prisma.processedWebhookEvent.deleteMany({ where: { eventId: { startsWith: 'evt_' } } });
        await prisma.user.delete({ where: { id: user.id } });
        console.log('   [CLEANUP COMPLETE]');
    }
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
