import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET /api/retreats/[id] — a single published retreat/workshop/event (public). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const retreat = await prisma.retreat.findUnique({ where: { id } });
    if (!retreat || retreat.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ retreat });
}
