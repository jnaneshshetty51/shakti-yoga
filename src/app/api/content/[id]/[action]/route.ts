import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkAchievements } from '@/lib/achievements';

export const dynamic = 'force-dynamic';

type Action = 'like' | 'save' | 'view';
const KIND: Record<Exclude<Action, 'view'>, string> = { like: 'like', save: 'save' };
const COUNT: Record<Action, 'likeCount' | 'saveCount' | 'viewCount'> = {
    like: 'likeCount',
    save: 'saveCount',
    view: 'viewCount',
};

function parse(v: string): Action | null {
    return v === 'like' || v === 'save' || v === 'view' ? v : null;
}

/** POST /api/content/:id/view — fire-and-forget counter bump (no auth needed). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
    const { id, action: raw } = await ctx.params;
    const action = parse(raw);
    if (!action) return NextResponse.json({ error: 'Unknown action' }, { status: 404 });

    if (action === 'view') {
        await prisma.content
            .updateMany({ where: { id, status: 'PUBLISHED' }, data: { viewCount: { increment: 1 } } })
            .catch(() => {});
        return NextResponse.json({ ok: true });
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const content = await prisma.content.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } });
    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const kind = KIND[action];
    try {
        await prisma.contentInteraction.create({ data: { userId: session.id, contentId: id, kind } });
        const updated = await prisma.content.update({
            where: { id },
            data: { [COUNT[action]]: { increment: 1 } },
            select: { likeCount: true, saveCount: true },
        });
        if (action === 'save') void checkAchievements(session.id).catch(() => {});
        return NextResponse.json({ on: true, likeCount: updated.likeCount, saveCount: updated.saveCount });
    } catch {
        // Unique-constraint hit -> already liked/saved; return current counts.
        const cur = await prisma.content.findUnique({ where: { id }, select: { likeCount: true, saveCount: true } });
        return NextResponse.json({ on: true, ...cur });
    }
}

/** DELETE /api/content/:id/(like|save) — undo. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
    const { id, action: raw } = await ctx.params;
    const action = parse(raw);
    if (!action || action === 'view') return NextResponse.json({ error: 'Unknown action' }, { status: 404 });

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const kind = KIND[action];
    const removed = await prisma.contentInteraction.deleteMany({
        where: { userId: session.id, contentId: id, kind },
    });
    if (removed.count > 0) {
        await prisma.content
            .update({ where: { id }, data: { [COUNT[action]]: { decrement: 1 } } })
            .catch(() => {});
    }
    const cur = await prisma.content.findUnique({ where: { id }, select: { likeCount: true, saveCount: true } });
    return NextResponse.json({ on: false, ...cur });
}
