import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializePractice } from '@/lib/practice';

export const dynamic = 'force-dynamic';

/** GET /api/practices/:id — one practice by id or slug. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();

    try {
        const row =
            (await prisma.practice.findUnique({ where: { id } })) ??
            (await prisma.practice.findUnique({ where: { slug: id } }));
        if (!row || row.status !== 'PUBLISHED') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        let completed = false;
        let completionCount = 0;
        if (session) {
            completionCount = await prisma.practiceCompletion.count({
                where: { userId: session.id, practiceId: row.id },
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
