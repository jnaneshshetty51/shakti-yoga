import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendPush } from '@/lib/push';
import { PatientUpdateStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET /api/therapy/updates — the member's own progress updates + therapist replies. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.patientUpdate.findMany({
        where: { userId: session.id },
        include: { reviewedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json({
        updates: rows.map((u) => ({
            id: u.id,
            body: u.body,
            status: u.status,
            reviewNote: u.reviewNote,
            reviewedBy: u.reviewedBy?.name ?? null,
            reviewedAt: u.reviewedAt?.toISOString() ?? null,
            createdAt: u.createdAt.toISOString(),
        })),
    });
}

/** POST /api/therapy/updates { body } — the member logs a progress update for their therapist. */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const gate = rateLimit(`therapy-update:${session.id}`, 5, 60 * 60 * 1000);
    if (!gate.allowed) {
        return NextResponse.json(
            { error: 'You have sent a few updates already. Try again a little later.' },
            { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } },
        );
    }

    const json = await request.json().catch(() => ({}));
    const body = String(json.body ?? '').trim().slice(0, 2000);
    if (body.length < 3) return NextResponse.json({ error: 'Write a little more.' }, { status: 400 });

    const created = await prisma.patientUpdate.create({
        data: { userId: session.id, body, status: PatientUpdateStatus.PENDING },
        select: { id: true, createdAt: true },
    });

    // Notify the therapists so it lands in their review queue.
    const therapists = await prisma.user.findMany({
        where: { OR: [{ role: 'TEACHER' }, { adminDepartment: 'THERAPIST' }] },
        select: { id: true },
    });
    for (const t of therapists) {
        sendPush(t.id, {
            title: 'New patient update',
            body: body.slice(0, 120),
            url: '/admin/therapy/updates',
            channelId: 'sessions',
        }).catch(() => {});
    }

    return NextResponse.json({ id: created.id, createdAt: created.createdAt.toISOString() });
}
