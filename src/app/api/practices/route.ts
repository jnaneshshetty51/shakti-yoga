import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializePractice, PRACTICE_TYPES, toPracticeLevel } from '@/lib/practice';
import { toContentCategory } from '@/lib/content';
import { audienceWhere } from '@/lib/content-audience';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET /api/practices?category=&level= — published Short Practices + Take a Moment items. */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const session = await getSession();

    const where: Prisma.ContentWhereInput = {
        status: 'PUBLISHED',
        type: { in: PRACTICE_TYPES },
        ...(await audienceWhere(session?.id ?? null)),
    };
    if (url.searchParams.get('category')) where.category = toContentCategory(url.searchParams.get('category'));
    const level = url.searchParams.get('level') ? toPracticeLevel(url.searchParams.get('level')) : null;
    if (level) where.difficulty = level;

    try {
        const rows = await prisma.content.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }] });
        let done = new Set<string>();
        if (session && rows.length) {
            const c = await prisma.contentCompletion.findMany({
                where: { userId: session.id, contentId: { in: rows.map((r) => r.id) } },
                select: { contentId: true },
            });
            done = new Set(c.map((x) => x.contentId));
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
