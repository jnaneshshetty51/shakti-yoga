import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'STAFF_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const groups = await prisma.whatsAppGroup.findMany({
            where: {
                active: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        const formattedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            role: group.role.replace('_', ' ').toLowerCase(),
            whatsappLink: group.link,
            pinnedMessage: group.pinnedMessage || '',
        }));

        return NextResponse.json({ groups: formattedGroups });
    } catch (error) {
        console.error('Admin community API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'STAFF_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, whatsappLink, pinnedMessage } = body;

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        const updated = await prisma.whatsAppGroup.update({
            where: { id },
            data: {
                link: whatsappLink,
                pinnedMessage: pinnedMessage,
            },
        });

        return NextResponse.json({ group: updated });
    } catch (error) {
        console.error('Admin community update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

