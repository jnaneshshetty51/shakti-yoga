import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/certificates — the caller's own approved certificates. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const certificates = await prisma.certificate.findMany({
        where: { userId: session.id, status: 'APPROVED' },
        orderBy: { approvedAt: 'desc' },
    });

    return NextResponse.json({ certificates }, { headers: { 'Cache-Control': 'no-store' } });
}
