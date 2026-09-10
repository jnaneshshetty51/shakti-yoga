import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { CertificateStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const status = new URL(request.url).searchParams.get('status');

    const certificates = await prisma.certificate.findMany({
        where: status && status !== 'all' ? { status: status.toUpperCase() as CertificateStatus } : undefined,
        include: {
            user: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({ certificates });
}

/** POST /api/admin/certificates — manual issuance by Founder/Admin. */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId || '');
    const title = String(body.title || '').trim().slice(0, 200);
    const reason = body.reason ? String(body.reason).trim().slice(0, 1000) : null;
    if (!userId || !title) return NextResponse.json({ error: 'User and title are required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const certificate = await prisma.certificate.create({
        data: { userId, title, reason, sourceType: 'Manual' },
    });

    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: 'certificate.issue', entity: 'Certificate', entityId: certificate.id,
        after: { userId, title },
    });

    return NextResponse.json({ certificate });
}
