import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { CertificateStatus, Prisma } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q')?.trim();
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

    const where: Prisma.CertificateWhereInput = {
        ...(status && status !== 'all' ? { status: status.toUpperCase() as CertificateStatus } : {}),
        ...(q ? { OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
        ] } : {}),
    };

    const [certificates, totalCount] = await Promise.all([
        prisma.certificate.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true } },
            },
            orderBy: { issuedAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.certificate.count({ where }),
    ]);

    return NextResponse.json({ certificates, page, pageSize, totalCount });
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
