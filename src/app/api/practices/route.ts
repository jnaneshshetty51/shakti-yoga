import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializePractice } from '@/lib/practice';
import { toContentCategory } from '@/lib/content';
import { toPracticeLevel } from '@/lib/practice';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET /api/practices?category=&level= — published guided practices. */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const where: Prisma.PracticeWhereInput = { status: 'PUBLISHED' };
    if (url.searchParams.get('category')) where.category = toContentCategory(url.searchParams.get('category'));
    if (url.searchParams.get('level')) where.level = toPracticeLevel(url.searchParams.get('level'));

    const session = await getSession();

    try {
        const rows = await prisma.practice.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }] });
        let done = new Set<string>();
        if (session && rows.length) {
            const c = await prisma.practiceCompletion.findMany({
                where: { userId: session.id, practiceId: { in: rows.map((r) => r.id) } },
                select: { practiceId: true },
            });
            done = new Set(c.map((x) => x.practiceId));
        }
        return NextResponse.json(
            { practices: rows.map((r) => serializePractice(r, { completed: done.has(r.id) })) },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[practices] failed', error);
        return NextResponse.json({ practices: [] });
    }
}
