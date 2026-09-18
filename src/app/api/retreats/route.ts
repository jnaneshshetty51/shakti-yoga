import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RetreatKind } from '@prisma/client';

/** GET /api/retreats — published retreats/workshops/events that haven't ended, soonest first. */
export async function GET(request: Request) {
    try {
        const kind = new URL(request.url).searchParams.get('kind');
        const now = new Date();
        const retreats = await prisma.retreat.findMany({
            where: {
                status: 'PUBLISHED',
                // A short grace window past endDate (matches /api/challenges'
                // own pattern) rather than an instant cutoff, so something
                // that just wrapped up doesn't disappear mid-conversation.
                endDate: { gte: new Date(now.getTime() - 7 * 86_400_000) },
                ...(kind && kind !== 'all' ? { kind: kind.toUpperCase() as RetreatKind } : {}),
            },
            orderBy: { startDate: 'asc' },
        });
        return NextResponse.json({ retreats });
    } catch (error) {
        console.error('Retreats GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
