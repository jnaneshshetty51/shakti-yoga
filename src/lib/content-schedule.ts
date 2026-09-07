import { prisma } from '@/lib/prisma';
import { notifyContentPublished } from '@/lib/content-notify';

/**
 * Flip any scheduled Content whose time has arrived to PUBLISHED. A scheduled
 * item is a DRAFT with a past `scheduledAt`. Idempotent — safe to run often.
 * Returns the number published.
 */
export async function publishScheduledContent(now: Date = new Date()): Promise<number> {
    const due = await prisma.content.findMany({
        where: { status: 'DRAFT', scheduledAt: { lte: now } },
        select: { id: true, publishedAt: true },
    });
    if (due.length === 0) return 0;

    await prisma.$transaction(
        due.map((d) =>
            prisma.content.update({
                where: { id: d.id },
                data: { status: 'PUBLISHED', publishedAt: d.publishedAt ?? now },
            }),
        ),
    );

    for (const d of due) await notifyContentPublished(d.id);

    return due.length;
}
