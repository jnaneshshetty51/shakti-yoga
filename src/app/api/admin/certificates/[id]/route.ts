import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { sendPush } from '@/lib/push';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** PATCH /api/admin/certificates/[id] — approve or revoke. Founder/Admin only action. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '').toUpperCase();
    if (status !== 'APPROVED' && status !== 'REVOKED') {
        return NextResponse.json({ error: 'Status must be APPROVED or REVOKED' }, { status: 400 });
    }

    const before = await prisma.certificate.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const certificate = await prisma.certificate.update({
        where: { id },
        data: status === 'APPROVED'
            ? { status: 'APPROVED', approvedAt: new Date(), approvedById: admin.id }
            : { status: 'REVOKED' },
    });

    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: `certificate.${status.toLowerCase()}`, entity: 'Certificate', entityId: id,
        before: { status: before.status }, after: { status: certificate.status },
    });

    if (status === 'APPROVED') {
        sendPush(certificate.userId, {
            title: 'Certificate ready',
            body: `Your certificate "${certificate.title}" is ready to download.`,
            url: '/dashboard/certificates',
        }).catch(() => {});
    }

    return NextResponse.json({ certificate });
}
