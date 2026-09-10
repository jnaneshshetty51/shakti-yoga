import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RetreatKind } from '@prisma/client';

/** GET /api/retreats — published retreats/workshops/events, soonest first. */
export async function GET(request: Request) {
    const kind = new URL(request.url).searchParams.get('kind');
    const retreats = await prisma.retreat.findMany({
        where: {
            status: 'PUBLISHED',
            ...(kind && kind !== 'all' ? { kind: kind.toUpperCase() as RetreatKind } : {}),
        },
        orderBy: { startDate: 'asc' },
    });
    return NextResponse.json({ retreats });
}
