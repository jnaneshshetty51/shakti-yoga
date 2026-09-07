import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';
import { cancelSubscription } from '@/lib/razorpay';

/**
 * Irreversibly close a member's account (App Store / Play "delete account"
 * requirement). Financial rows (Payment) are kept for accounting but detached
 * from personal data: the User row is anonymised rather than hard-deleted, which
 * also keeps foreign keys that lack ON DELETE CASCADE valid.
 *
 * Effects:
 *  - active Razorpay subscription cancelled, Subscription row removed
 *  - future bookings cancelled, all booking notes (health data) scrubbed
 *  - UserProfile (goals / medical history) deleted
 *  - avatar file removed from object storage
 *  - push tokens deleted
 *  - testimonials detached (kept, author name retained as already public)
 *  - User PII cleared, password removed, role reset to VISITOR
 *  - tokenVersion bumped → every outstanding session (web + mobile) is revoked
 */
export async function deleteAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true, subscription: true },
    });
    if (!user) return;

    // Stop future charges before we drop the local subscription row.
    const sub = user.subscription;
    if (sub?.recurring && sub.billingProviderId) {
        try {
            await cancelSubscription(sub.billingProviderId, true);
        } catch (err) {
            console.error('[deleteAccount] Razorpay cancel failed (continuing):', err);
        }
    }

    await prisma.$transaction([
        prisma.pushToken.deleteMany({ where: { userId } }),
        prisma.userProfile.deleteMany({ where: { userId } }),
        prisma.subscription.deleteMany({ where: { userId } }),
        prisma.booking.updateMany({
            where: { userId, status: { in: ['PENDING', 'CONFIRMED'] } },
            data: { status: 'CANCELLED', meetingLink: null },
        }),
        prisma.booking.updateMany({ where: { userId }, data: { notes: null } }),
        prisma.story.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.analyticsEvent.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.user.update({
            where: { id: userId },
            data: {
                name: 'Deleted member',
                email: `deleted-${userId}@deleted.shaktiyoga.in`,
                phone: null,
                country: null,
                avatarUrl: null,
                passwordHash: null,
                role: 'VISITOR',
                credits: 0,
                tokenVersion: { increment: 1 },
            },
        }),
    ]);

    if (user.avatarUrl) {
        deleteFile(user.avatarUrl).catch(() => {});
    }
}
