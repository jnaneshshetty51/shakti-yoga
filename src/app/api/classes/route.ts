import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canJoinGroupClass } from '@/lib/class-access';
import { ensureInstances, isJoinable, istParts } from '@/lib/class-schedule';
import type { ClassView } from '@/types/class';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await canJoinGroupClass(session.id);

    // Non-eligible members still get a shaped response so the page can show the
    // right call to action (renew / book a 1:1 / choose a plan).
    if (!access.ok) {
        return NextResponse.json({ today: [], upcoming: [], access });
    }

    try {
        await ensureInstances().catch((e) => console.error('ensureInstances (lazy) failed:', e));

        const now = new Date();
        const horizon = new Date(now.getTime() + 8 * 86_400_000);

        const instances = await prisma.classInstance.findMany({
            where: {
                date: { gte: new Date(now.getTime() - 3 * 3_600_000), lte: horizon },
                status: { not: 'Cancelled' },
                batch: { active: true, planType: 'EVERYDAY_YOGA' },
            },
            include: { batch: { include: { teacher: { select: { name: true } } } } },
            orderBy: { date: 'asc' },
        });

        const todayIst = istParts(now);
        const today: ClassView[] = [];
        const upcoming: ClassView[] = [];

        for (const inst of instances) {
            const view: ClassView = {
                id: inst.id,
                batchName: inst.batch.name,
                teacher: inst.batch.teacher.name,
                startsAt: inst.date.toISOString(),
                endsAt: new Date(inst.date.getTime() + inst.batch.durationMin * 60_000).toISOString(),
                status: inst.status,
                joinable: isJoinable(inst, inst.batch, now),
            };
            const d = istParts(inst.date);
            const isToday = d.year === todayIst.year && d.month1 === todayIst.month1 && d.day === todayIst.day;
            (isToday ? today : upcoming).push(view);
        }

        return NextResponse.json({ today, upcoming, access: { ok: true } });
    } catch (error) {
        console.error('Classes API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
