import { prisma } from '@/lib/prisma';
import { sendPush } from '@/lib/push';

/** First ~120 chars of a body, single line. */
function snippet(s: string | null, fallback: string): string {
    const t = (s ?? '').replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return fallback;
    return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

/**
 * Send one push for a Content item the first time it's published, if it opted in.
 * Idempotent — `notifiedAt` is claimed atomically so the admin save and the
 * scheduled-publish cron can't double-fire. Safe to call fire-and-forget.
 */
export async function notifyContentPublished(id: string): Promise<boolean> {
    const c = await prisma.content.findUnique({
        where: { id },
        select: {
            id: true, type: true, title: true, body: true, caption: true,
            status: true, notifyOnPublish: true, notifiedAt: true,
        },
    });
    if (!c || c.status !== 'PUBLISHED' || !c.notifyOnPublish || c.notifiedAt) return false;

    // Claim before sending.
    const claim = await prisma.content.updateMany({
        where: { id, notifiedAt: null },
        data: { notifiedAt: new Date() },
    });
    if (claim.count === 0) return false;

    const tokenRows = await prisma.pushToken.findMany({ select: { userId: true } });
    const userIds = [...new Set(tokenRows.map((r) => r.userId))];
    if (userIds.length === 0) return true;

    const msg =
        c.type === 'REEL'
            ? { title: 'New reel on Shakti Yoga', body: snippet(c.caption, c.title), url: `/reel/${c.id}` }
            : c.type === 'ANNOUNCEMENT'
              ? { title: c.title, body: snippet(c.body, 'Tap to read the announcement.'), url: `/post/${c.id}` }
              : { title: 'New from Shakti Yoga', body: snippet(c.body, c.title), url: `/post/${c.id}` };

    await sendPush(userIds, { ...msg, channelId: 'default' });
    return true;
}
