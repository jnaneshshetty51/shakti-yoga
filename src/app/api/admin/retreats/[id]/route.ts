import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { RetreatStatus } from '@prisma/client';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const { name, location, startDate, endDate, description, capacity, price, currency, status } = body;

    const data: Record<string, unknown> = {};
    if (name) data.name = String(name).slice(0, 200);
    if (location !== undefined) data.location = location || null;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (description !== undefined) data.description = description || null;
    if (capacity !== undefined) data.capacity = capacity === '' ? null : Number(capacity);
    if (price !== undefined) data.price = price === '' ? null : Number(price);
    if (currency) data.currency = currency;
    if (status) {
        const s = String(status).toUpperCase();
        if (!(s in RetreatStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        data.status = s;
    }

    const retreat = await prisma.retreat.update({ where: { id }, data });
    return NextResponse.json({ retreat });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    await prisma.retreat.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
