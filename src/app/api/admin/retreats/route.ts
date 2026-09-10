import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { RetreatKind, RetreatStatus } from '@prisma/client';

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const retreats = await prisma.retreat.findMany({
        include: { _count: { select: { enquiries: true } } },
        orderBy: { startDate: 'desc' },
    });
    return NextResponse.json({ retreats });
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { name, kind, location, startDate, endDate, description, capacity, price, currency } = body;
    if (!name || !startDate || !endDate) {
        return NextResponse.json({ error: 'Name, start date and end date are required' }, { status: 400 });
    }
    const k = String(kind || 'RETREAT').toUpperCase();
    if (!(k in RetreatKind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });

    const retreat = await prisma.retreat.create({
        data: {
            name, kind: k as RetreatKind,
            location: location || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            description: description || null,
            capacity: capacity ? Number(capacity) : null,
            price: price ? Number(price) : null,
            currency: currency || 'INR',
            status: RetreatStatus.DRAFT,
        },
    });
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'retreat.create', entity: 'Retreat', entityId: retreat.id, after: { name } });
    return NextResponse.json({ retreat });
}
