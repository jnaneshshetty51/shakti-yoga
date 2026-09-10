import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { sendPush } from '@/lib/push';
import { PatientUpdateStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET ?status=pending|reviewed|all */
export async function GET(request: Request) {
    if (!(await requireDepartment('THERAPIST'))) return forbidden();
    const status = new URL(request.url).searchParams.get('status') ?? 'pending';

    const rows = await prisma.patientUpdate.findMany({
        where: status === 'all' ? {} : { status: status === 'reviewed' ? PatientUpdateStatus.REVIEWED : PatientUpdateStatus.PENDING },
        include: {
            user: { select: { id: true, name: true, email: true } },
            reviewedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json({
        updates: rows.map((u) => ({
            id: u.id,
            userId: u.userId,
            name: u.user.name,
            email: u.user.email,
            body: u.body,
            attachmentKey: u.attachmentKey,
            status: u.status,
            reviewNote: u.reviewNote,
            reviewedBy: u.reviewedBy?.name ?? null,
            reviewedAt: u.reviewedAt?.toISOString() ?? null,
            createdAt: u.createdAt.toISOString(),
        })),
        pendingCount: await prisma.patientUpdate.count({ where: { status: PatientUpdateStatus.PENDING } }),
    });
}

/** PATCH — mark reviewed with an optional note (pushes the member).  { id, reviewNote } */
export async function PATCH(request: Request) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '');
    const reviewNote = body.reviewNote ? String(body.reviewNote).slice(0, 2000) : null;

    const update = await prisma.patientUpdate.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.patientUpdate.update({
        where: { id },
        data: { status: PatientUpdateStatus.REVIEWED, reviewNote, reviewedById: admin.id, reviewedAt: new Date() },
    });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.update.review', entity: 'PatientUpdate', entityId: id, after: { note: reviewNote },
    });
    sendPush(update.userId, {
        title: 'Your therapist reviewed your update',
        body: reviewNote ? reviewNote.slice(0, 120) : 'Open the app to see their response.',
        url: '/dashboard/therapy/notes', channelId: 'sessions',
    }).catch(() => {});

    return NextResponse.json({ ok: true });
}
