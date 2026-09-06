import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Liveness + dependency check for external monitoring. 200 only if DB is reachable. */
export async function GET() {
    const checks: Record<string, 'ok' | 'fail'> = { app: 'ok', db: 'fail' };

    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.db = 'ok';
    } catch {
        checks.db = 'fail';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return NextResponse.json(
        { status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() },
        { status: healthy ? 200 : 503 },
    );
}
