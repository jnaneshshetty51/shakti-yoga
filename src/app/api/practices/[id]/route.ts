import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializePractice, PRACTICE_TYPES } from '@/lib/practice';
import { canAccessContent } from '@/lib/content-audience';

export const dynamic = 'force-dynamic';

/** GET /api/practices/:id — one Short Practice / Take a Moment item, by id or slug. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();

    try {
        const row =
            (await prisma.content.findFirst({ where: { id, type: { in: PRACTICE_TYPES } } })) ??
            (await prisma.content.findFirst({ where: { slug: id, type: { in: PRACTICE_TYPES } } }));
        if (!row || row.status !== 'PUBLISHED') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (!(await canAccessContent(session?.id ?? null, row))) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        let completed = false;
        let completionCount = 0;
        if (session) {
            completionCount = await prisma.contentCompletion.count({
                where: { userId: session.id, contentId: row.id },
            });
            completed = completionCount > 0;
        }
        return NextResponse.json(
            { practice: serializePractice(row, { completed, completionCount }) },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[practices/:id] failed', error);
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
}
