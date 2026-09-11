import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const score = (v: unknown): number | null => {
    if (v === '' || v == null) return null;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null;
};

/** GET — a member's therapy progress readings, oldest first (for charting). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment(['THERAPIST', 'CONTENT']))) return forbidden();
    const { id } = await ctx.params;

    const rows = await prisma.therapyMeasurement.findMany({
        where: { userId: id },
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

/** POST — add a reading. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const takenAt = body.takenAt ? new Date(String(body.takenAt)) : new Date();
    const weightKg = body.weightKg === '' || body.weightKg == null ? null : Number(body.weightKg);

    const m = await prisma.therapyMeasurement.create({
        data: {
            userId: id,
            takenAt: Number.isNaN(+takenAt) ? new Date() : takenAt,
            painScore: score(body.painScore),
            mobilityScore: score(body.mobilityScore),
            sleepScore: score(body.sleepScore),
            stressScore: score(body.stressScore),
            weightKg: weightKg != null && Number.isFinite(weightKg) ? weightKg : null,
            note: body.note ? String(body.note).slice(0, 1000) : null,
            recordedById: admin.id,
        },
    });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.measurement.add', entity: 'TherapyMeasurement', entityId: m.id, after: { userId: id },
    });
    return NextResponse.json({ id: m.id });
}

/** DELETE ?measurementId= — scoped to the member in the URL, not just the id. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();
    const { id } = await ctx.params;
    const mid = new URL(request.url).searchParams.get('measurementId');
    if (!mid) return NextResponse.json({ error: 'Missing measurementId' }, { status: 400 });

    const { count } = await prisma.therapyMeasurement.deleteMany({ where: { id: mid, userId: id } });
    if (count === 0) return NextResponse.json({ error: 'Measurement not found for this member' }, { status: 404 });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.measurement.delete', entity: 'TherapyMeasurement', entityId: mid, after: { userId: id },
    });
    return NextResponse.json({ ok: true });
}
