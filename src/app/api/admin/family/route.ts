import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { PLANS } from '@/lib/pricing';
import { Role, SubscriptionStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const SEATS_TOTAL = 1 + PLANS.family.extraSeats;

function inviteCode(): string {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)]).join('');
}

/** GET /api/admin/family — every family plan, owner + seats. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();

    const owners = await prisma.subscription.findMany({
        where: { planType: 'FAMILY', familyOwnerId: null },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { startDate: 'desc' },
    });

    // One batched query for every seat across every family, grouped in memory,
    // instead of one findMany per owner (N+1 on the admin family page).
    const allSeats = owners.length
        ? await prisma.subscription.findMany({
              where: { familyOwnerId: { in: owners.map((o) => o.userId) } },
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { startDate: 'asc' },
          })
        : [];
    const seatsByOwner = new Map<string, typeof allSeats>();
    for (const seat of allSeats) {
        const list = seatsByOwner.get(seat.familyOwnerId!) ?? [];
        list.push(seat);
        seatsByOwner.set(seat.familyOwnerId!, list);
    }

    const groups = owners.map((owner) => {
        const seats = seatsByOwner.get(owner.userId) ?? [];
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
    });

    return NextResponse.json({ groups });
}

/** PATCH /api/admin/family  { ownerId, action: "resetCode" | "cancel" } */
export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const { ownerId, action } = await request.json().catch(() => ({}));
    const owner = await prisma.subscription.findUnique({ where: { userId: String(ownerId || '') } });
    if (!owner || owner.planType !== 'FAMILY' || owner.familyOwnerId) {
        return NextResponse.json({ error: 'Family owner not found.' }, { status: 404 });
    }
    const audit = auditAs({ id: admin.id, email: admin.email }, request);

    if (action === 'resetCode') {
        let saved: string | null = null;
        for (let i = 0; i < 6 && !saved; i++) {
            const candidate = inviteCode();
            try {
                await prisma.subscription.update({ where: { userId: owner.userId }, data: { familyInviteCode: candidate } });
                saved = candidate; // only set once the write actually succeeds
            } catch { /* unique clash — retry with a new candidate */ }
        }
        if (!saved) {
            return NextResponse.json({ error: 'Could not generate a unique invite code. Try again.' }, { status: 500 });
        }
        await audit({ action: 'family.code.reset', entity: 'Subscription', entityId: owner.id });
        return NextResponse.json({ ok: true, inviteCode: saved });
    }

    if (action === 'cancel') {
        const seats = await prisma.subscription.findMany({ where: { familyOwnerId: owner.userId }, select: { id: true, userId: true } });
        await prisma.$transaction([
            prisma.subscription.update({ where: { id: owner.id }, data: { status: SubscriptionStatus.CANCELLED } }),
            ...seats.flatMap((s) => [
                prisma.subscription.update({ where: { id: s.id }, data: { status: SubscriptionStatus.EXPIRED } }),
                prisma.user.update({ where: { id: s.userId }, data: { role: Role.VISITOR } }),
            ]),
        ]);
        await audit({ action: 'family.cancel', entity: 'Subscription', entityId: owner.id, after: { seatsReleased: seats.length } });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/** DELETE /api/admin/family?seatId=<subId> — remove one seat from a family group. */
export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const seatId = new URL(request.url).searchParams.get('seatId');
    if (!seatId) return NextResponse.json({ error: 'Missing seatId' }, { status: 400 });

    const seat = await prisma.subscription.findUnique({ where: { id: seatId } });
    if (!seat || !seat.familyOwnerId) {
        return NextResponse.json({ error: 'Seat not found.' }, { status: 404 });
    }

    await prisma.$transaction([
        prisma.subscription.update({ where: { id: seatId }, data: { status: SubscriptionStatus.EXPIRED, familyOwnerId: null } }),
        prisma.user.update({ where: { id: seat.userId }, data: { role: Role.VISITOR } }),
    ]);
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'family.seat.remove', entity: 'Subscription', entityId: seatId, before: { userId: seat.userId },
    });
    return NextResponse.json({ ok: true });
}
