import { prisma } from '@/lib/prisma';
import { canJoinGroupClass, type ClassAccess } from '@/lib/class-access';
import { ensureInstances, isJoinable, istParts } from '@/lib/class-schedule';
import type { ClassView } from '@/types/class';

export interface ClassFeed {
    today: ClassView[];
    upcoming: ClassView[];
    access: ClassAccess;
}

/**
 * The member's daily group-class feed: today's and the next 8 days of Everyday
 * Yoga instances, plus their access decision. Non-eligible members get empty
 * lists and a shaped `access` so the UI can show the right call to action.
 * Throws on a DB error — callers decide the fallback.
 */
export async function getClassFeed(userId: string): Promise<ClassFeed> {
    const access = await canJoinGroupClass(userId);
    if (!access.ok) return { today: [], upcoming: [], access };

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

    return { today, upcoming, access };
}
