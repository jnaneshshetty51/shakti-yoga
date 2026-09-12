import { prisma } from '@/lib/prisma';
import { getPlan, PLANS } from '@/lib/pricing';
import { activatePlan } from '@/lib/subscription';
import { mapDatabaseRole } from '@/lib/auth';
import { recordEvent } from '@/lib/analytics';
import { Role, SubscriptionStatus } from '@prisma/client';

const FAMILY_SEATS = 1 + PLANS.family.extraSeats; // owner + extra

function code(): string {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)]).join('');
}

/** Ensure a family owner has an invite code. Returns null for non-family subs. */
export async function ensureFamilyCode(userId: string): Promise<string | null> {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.planType !== 'FAMILY' || sub.familyOwnerId) return null; // not a family owner
    if (sub.familyInviteCode) return sub.familyInviteCode;
    for (let i = 0; i < 6; i++) {
        try {
            const c = code();
            await prisma.subscription.update({ where: { userId }, data: { familyInviteCode: c } });
            return c;
        } catch {
            /* clash */
        }
    }
    return null;
}

export interface FamilyView {
    isFamily: boolean;
    isOwner: boolean;
    code: string | null;
    seatsUsed: number;
    seatsTotal: number;
    members: { name: string; owner: boolean }[];
    ownerName?: string;
}

export async function familyView(userId: string): Promise<FamilyView> {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.planType !== 'FAMILY') {
        return { isFamily: false, isOwner: false, code: null, seatsUsed: 0, seatsTotal: FAMILY_SEATS, members: [] };
    }

    if (sub.familyOwnerId) {
        const owner = await prisma.user.findUnique({ where: { id: sub.familyOwnerId }, select: { name: true } });
        return {
            isFamily: true, isOwner: false, code: null,
            seatsUsed: 0, seatsTotal: FAMILY_SEATS, members: [],
            ownerName: owner?.name ?? 'the plan owner',
        };
    }

    const seats = await prisma.subscription.findMany({
        where: { familyOwnerId: userId },
        select: { user: { select: { name: true } } },
    });
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const c = await ensureFamilyCode(userId);
    return {
        isFamily: true,
        isOwner: true,
        code: c,
        seatsUsed: 1 + seats.length,
        seatsTotal: FAMILY_SEATS,
        members: [
            { name: me?.name ?? 'You', owner: true },
            ...seats.map((s) => ({ name: s.user.name, owner: false })),
        ],
    };
}

export type JoinResult =
    | { ok: true; role: string }
    | { ok: false; error: string; status: number };

/** Redeem a family seat code. */
export async function joinFamily(userId: string, rawCode: string): Promise<JoinResult> {
    const c = String(rawCode ?? '').trim().toUpperCase();
    if (c.length !== 6) return { ok: false, error: 'That code doesn’t look right.', status: 400 };

    const ownerSub = await prisma.subscription.findUnique({ where: { familyInviteCode: c }, include: { user: true } });
    if (!ownerSub || ownerSub.planType !== 'FAMILY' || ownerSub.familyOwnerId) {
        return { ok: false, error: 'This invite code isn’t valid.', status: 404 };
    }
    if (ownerSub.userId === userId) {
        return { ok: false, error: 'That’s your own family plan.', status: 400 };
    }
    const live =
        (ownerSub.status === SubscriptionStatus.ACTIVE || ownerSub.status === SubscriptionStatus.TRIAL) &&
        ownerSub.renewalDate.getTime() > Date.now();
    if (!live) return { ok: false, error: 'This family plan isn’t active.', status: 409 };

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (me && ['MEMBER_EVERYDAY', 'MEMBER_THERAPY', 'MEMBER_STARTER'].includes(me.role)) {
        return { ok: false, error: 'You already have a membership. Cancel it first to join a family plan.', status: 409 };
    }

    // Atomically claim a seat: a single conditional UPDATE is race-free at the
    // database level regardless of connection pooling, unlike the count-then-
    // create pattern this replaced (two concurrent joins could both read the
    // same under-capacity count and both proceed, overselling the plan).
    const claimed = await prisma.$executeRaw`
        UPDATE "Subscription" SET "seatsClaimed" = "seatsClaimed" + 1
        WHERE id = ${ownerSub.id} AND "seatsClaimed" < ${PLANS.family.extraSeats}
    `;
    if (claimed === 0) {
        return { ok: false, error: 'This family plan is full.', status: 409 };
    }

    const plan = getPlan('family');
    let activated;
    try {
        activated = await activatePlan(userId, plan, {
            renewalDate: ownerSub.renewalDate,
            familyOwnerId: ownerSub.userId,
            amount: 0,
            currency: ownerSub.currency,
            provider: ownerSub.provider as 'razorpay' | 'apple' | 'google',
        });
    } catch (err) {
        // Release the claimed seat — activation didn't actually happen.
        await prisma.subscription.update({ where: { id: ownerSub.id }, data: { seatsClaimed: { decrement: 1 } } }).catch(() => {});
        throw err;
    }
    const { user } = activated;

    void recordEvent('subscription_started', {
        userId,
        metadata: { plan: 'family', seat: true, owner: ownerSub.userId },
    });
    return { ok: true, role: mapDatabaseRole(user.role) };
}

/** Expire family seats whose owner's plan is no longer live. Call from cron. */
export async function reconcileFamilySeats(): Promise<number> {
    const seats = await prisma.subscription.findMany({
        where: { familyOwnerId: { not: null }, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
        select: { id: true, userId: true, familyOwnerId: true },
    });
    let expired = 0;
    for (const seat of seats) {
        const owner = await prisma.subscription.findUnique({ where: { userId: seat.familyOwnerId! } });
        const ownerLive =
            owner &&
            (owner.status === SubscriptionStatus.ACTIVE ||
                owner.status === SubscriptionStatus.TRIAL ||
                owner.status === SubscriptionStatus.CANCELLED) &&
            owner.renewalDate.getTime() > Date.now();
        if (!ownerLive) {
            await prisma.$transaction([
                prisma.subscription.update({ where: { id: seat.id }, data: { status: SubscriptionStatus.EXPIRED } }),
                prisma.user.update({ where: { id: seat.userId }, data: { role: Role.VISITOR } }),
            ]);
            expired += 1;
        }
    }
    return expired;
}
