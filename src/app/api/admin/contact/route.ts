import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    const messages = await prisma.contactMessage.findMany({
        orderBy: [{ handled: 'asc' }, { createdAt: 'desc' }],
        take: 200,
    });
    return NextResponse.json({ messages });
}

export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const { id, handled } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.contactMessage.update({ where: { id }, data: { handled: Boolean(handled) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin contact PATCH error:', error);
        return NextResponse.json({ error: 'Could not update message' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.contactMessage.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin contact DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete message' }, { status: 500 });
    }
}
