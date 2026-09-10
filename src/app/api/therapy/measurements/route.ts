import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/therapy/measurements — the signed-in member's own therapy progress
 * readings, oldest first (for the "Therapy Journey" chart in the app).
 * Readings are recorded by therapists via the admin dashboard.
 */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.therapyMeasurement.findMany({
        where: { userId: session.id },
        orderBy: { takenAt: 'asc' },
        include: { recordedBy: { select: { name: true } } },
    });

    return NextResponse.json({
        measurements: rows.map((m) => ({
            id: m.id,
            takenAt: m.takenAt.toISOString(),
            painScore: m.painScore,
            mobilityScore: m.mobilityScore,
            sleepScore: m.sleepScore,
            stressScore: m.stressScore,
            weightKg: m.weightKg,
            note: m.note,
            recordedBy: m.recordedBy?.name ?? null,
        })),
    });
}
