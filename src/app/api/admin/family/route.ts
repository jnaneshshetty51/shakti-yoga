import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { PLANS } from '@/lib/pricing';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const SEATS_TOTAL = 1 + PLANS.family.extraSeats;

/** GET /api/admin/family — every family plan, owner + seats, read-only. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();

    const owners = await prisma.subscription.findMany({
        where: { planType: 'FAMILY', familyOwnerId: null },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { startDate: 'desc' },
    });

    const groups = await Promise.all(
        owners.map(async (owner) => {
            const seats = await prisma.subscription.findMany({
                where: { familyOwnerId: owner.userId },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { startDate: 'asc' },
            });
            return {
                id: owner.id,
                ownerId: owner.userId,
                ownerName: owner.user.name,
                ownerEmail: owner.user.email,
                status: owner.status,
                renewalDate: owner.renewalDate,
                inviteCode: owner.familyInviteCode,
                seatsUsed: 1 + seats.length,
                seatsTotal: SEATS_TOTAL,
                members: seats.map((s) => ({
                    id: s.id,
                    userId: s.userId,
                    name: s.user.name,
                    email: s.user.email,
                    status: s.status,
                    renewalDate: s.renewalDate,
                })),
            };
        }),
    );

    return NextResponse.json({ groups });
}
